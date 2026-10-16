"use client";

import { useState } from "react";
import { Building, Pencil, Plus } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnGhost, btnSecondary, btnSmall, cardBase, thBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/time/businessTime";
import { useDepartmentAssignments } from "@/features/shifts/hooks/useAssignments";
import { AssignDepartmentDialog } from "@/features/shifts/components/AssignDepartmentDialog";
import { shiftRefLabel } from "@/features/shifts/components/ShiftBadges";
import type { DatedShift, DepartmentAssignmentView, ShiftView } from "@/features/shifts/types";

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
        <p className="font-semibold text-slate-900">
          Default shift{defaultShift ? ` (${defaultShift.name})` : ""}
        </p>
        <p className="text-xs text-slate-500">
          {current ? `Since ${formatDay(current.effectiveFrom)}` : "No department shift set"}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="font-semibold text-slate-900">{shiftRefLabel(current.shift)}</p>
      <p className="text-xs text-slate-500">Since {formatDay(current.effectiveFrom)}</p>
    </div>
  );
}

function Upcoming({ upcoming }: { upcoming: DatedShift | null }) {
  if (!upcoming) return <span className="text-slate-400">None scheduled</span>;
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
  if (!row.overrides) return <span className="text-slate-400">None</span>;
  return (
    <button type="button" onClick={() => onShow(row.department)} className={`${btnGhost} -ml-2.5`}>
      {row.overrides} {row.overrides === 1 ? "override" : "overrides"}
    </button>
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
    <section className={cardBase} aria-label="Departments">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Departments</h2>
          <p className="text-sm text-slate-500">
            {canEdit
              ? "Everyone in a department works its shift unless they have a personal override."
              : "Set by a Super Admin. You can override the shift for your own staff under People."}
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={() => setDialog({ row: null })} className={btnSecondary}>
            <Plus className="h-4 w-4" aria-hidden />
            Set a department&apos;s shift
          </button>
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
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((row) => (
              <li
                key={`${row.companyId ?? "-"}|${row.departmentKey}`}
                className="space-y-2.5 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">{row.department}</h3>
                    <p className="text-sm text-slate-500">
                      {row.people} {row.people === 1 ? "person" : "people"}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setDialog({ row })}
                      className={btnSmall}
                      aria-label={`Change the shift for ${row.department}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Change
                    </button>
                  )}
                </div>
                <CurrentShift current={row.current} defaultShift={defaultShift} />
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Upcoming
                    </dt>
                    <dd className="mt-1">
                      <Upcoming upcoming={row.upcoming} />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th scope="col" className={`${thBase} pl-6`}>
                    Department
                  </th>
                  <th scope="col" className={thBase}>
                    People
                  </th>
                  <th scope="col" className={thBase}>
                    Shift today
                  </th>
                  <th scope="col" className={thBase}>
                    Upcoming
                  </th>
                  <th scope="col" className={thBase}>
                    Overrides
                  </th>
                  {canEdit && (
                    <th scope="col" className={`${thBase} pr-6 text-right`}>
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.companyId ?? "-"}|${row.departmentKey}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3.5 pl-6 pr-4 font-semibold text-slate-900">
                      {row.department}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-700">{row.people}</td>
                    <td className="px-4 py-3.5">
                      <CurrentShift current={row.current} defaultShift={defaultShift} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Upcoming upcoming={row.upcoming} />
                    </td>
                    <td className="px-4 py-3.5">
                      <OverridesCell row={row} onShow={onShowOverrides} />
                    </td>
                    {canEdit && (
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => setDialog({ row })}
                          className={btnSmall}
                          aria-label={`Change the shift for ${row.department}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Change
                        </button>
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
    </section>
  );
}
