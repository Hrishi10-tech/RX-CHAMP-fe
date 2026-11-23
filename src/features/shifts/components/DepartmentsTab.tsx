"use client";

import { useState } from "react";
import { Building, Pencil, Plus } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/time/businessTime";
import { useDepartmentAssignments } from "@/features/shifts/hooks/useAssignments";
import { AssignDepartmentDialog } from "@/features/shifts/components/AssignDepartmentDialog";
import { shiftRefLabel } from "@/features/shifts/components/ShiftBadges";
import type { DatedShift, DepartmentAssignmentView, ShiftView } from "@/features/shifts/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Th } from "@/components/ui/Table";

/** 4.1: the department's other shifts (Start Day picks the one that is on). */
function ExtraShifts({ row }: { row: DepartmentAssignmentView }) {
  const extras = row.extraShifts ?? [];
  if (!extras.length) return null;
  return (
    <div className="mt-1 min-w-0">
      {extras.map((s) => (
        <p key={s.id} className="font-semibold text-primary">
          {shiftRefLabel(s)}
        </p>
      ))}
      <p className="text-xs text-quiet">Picked by Start Day time</p>
    </div>
  );
}

function CurrentShift({
  current,
  defaultShift,
}: {
  current: DatedShift | null;
  defaultShift?: ShiftView;
}) {
  if (!current || !current.shift) {
    return (
      <div className="min-w-0">
        <p className="font-semibold text-primary">
          Default shift{defaultShift ? ` (${defaultShift.name})` : ""}
        </p>
        <p className="text-xs text-quiet">
          {current ? `Since ${formatDay(current.effectiveFrom)}` : "No department shift set"}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="font-semibold text-primary">{shiftRefLabel(current.shift)}</p>
      <p className="text-xs text-quiet">Since {formatDay(current.effectiveFrom)}</p>
    </div>
  );
}

function Upcoming({ upcoming }: { upcoming: DatedShift | null }) {
  if (!upcoming) return <span className="text-quiet">None scheduled</span>;
  return (
    <Chip tone="info" title={shiftRefLabel(upcoming.shift, "Default shift")}>
      {upcoming.shift?.name ?? "Default shift"} from {formatDay(upcoming.effectiveFrom)}
    </Chip>
  );
}

function OverridesCell({
  row,
  onShow,
}: {
  row: DepartmentAssignmentView;
  onShow: (department: string) => void;
}) {
  if (!row.overrides) return <span className="text-quiet">None</span>;
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={() => onShow(row.department)}
      className="-ml-2.5"
    >
      {row.overrides} {row.overrides === 1 ? "override" : "overrides"}
    </Button>
  );
}

/**
 * Each department's shift today and any change already scheduled. A Super Admin
 * changes them; a Manager sees their team's departments, read-only.
 */
export function DepartmentsTab({
  canEdit,
  shifts,
  onShowOverrides,
}: {
  canEdit: boolean;
  shifts: ShiftView[] | undefined;
  onShowOverrides: (department: string) => void;
}) {
  const { data, isLoading, isError, error, refetch, isFetching } = useDepartmentAssignments();
  const [dialog, setDialog] = useState<{ row: DepartmentAssignmentView | null } | null>(null);
  const defaultShift = shifts?.find((s) => s.isDefault);
  const rows = data ?? [];

  return (
    <Card as="section" aria-label="Departments">
      <div className="flex flex-col gap-3 border-b border-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-primary">Departments</h2>
          <p className="text-sm text-quiet">
            {canEdit
              ? "Everyone in a department works its shift unless they have a personal override."
              : "Set by the Admin."}
          </p>
        </div>
        {canEdit && (
          <Button variant="secondary" type="button" onClick={() => setDialog({ row: null })}>
            <Plus className="h-4 w-4" aria-hidden />
            Set a department&apos;s shift
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Loading departments…" />
      ) : isError ? (
        <ErrorState
          title="Couldn't load departments"
          message={errorMessage(error)}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No departments yet"
          message="Departments appear here once people are in them."
        />
      ) : (
        <>
          <ul className="divide-y divide-divider md:hidden">
            {rows.map((row) => (
              <li
                key={`${row.companyId ?? "-"}|${row.departmentKey}`}
                className="space-y-2.5 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-primary">{row.department}</h3>
                    <p className="text-sm text-quiet">
                      {row.people} {row.people === 1 ? "person" : "people"}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="small"
                      type="button"
                      onClick={() => setDialog({ row })}
                      aria-label={`Change the shift for ${row.department}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Change
                    </Button>
                  )}
                </div>
                <CurrentShift current={row.current} defaultShift={defaultShift} />
                <ExtraShifts row={row} />
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-quiet">
                      Upcoming
                    </dt>
                    <dd className="mt-1">
                      <Upcoming upcoming={row.upcoming} />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-quiet">
                      Overrides
                    </dt>
                    <dd className="mt-0.5">
                      <OverridesCell row={row} onShow={onShowOverrides} />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-card bg-fill/70">
                  <Th scope="col" className="pl-6">
                    Department
                  </Th>
                  <Th scope="col">People</Th>
                  <Th scope="col">Shift today</Th>
                  <Th scope="col">Upcoming</Th>
                  <Th scope="col">Overrides</Th>
                  {canEdit && (
                    <Th scope="col" className="pr-6 text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.companyId ?? "-"}|${row.departmentKey}`}
                    className="border-b border-divider last:border-0"
                  >
                    <td className="py-3.5 pl-6 pr-4 font-semibold text-primary">
                      {row.department}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-body">{row.people}</td>
                    <td className="px-4 py-3.5">
                      <CurrentShift current={row.current} defaultShift={defaultShift} />
                      <ExtraShifts row={row} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Upcoming upcoming={row.upcoming} />
                    </td>
                    <td className="px-4 py-3.5">
                      <OverridesCell row={row} onShow={onShowOverrides} />
                    </td>
                    {canEdit && (
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <Button
                          variant="small"
                          type="button"
                          onClick={() => setDialog({ row })}
                          aria-label={`Change the shift for ${row.department}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Change
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canEdit && (
        <AssignDepartmentDialog
          open={dialog !== null}
          row={dialog?.row ?? null}
          departments={rows}
          shifts={shifts}
          onClose={() => setDialog(null)}
        />
      )}
    </Card>
  );
}
