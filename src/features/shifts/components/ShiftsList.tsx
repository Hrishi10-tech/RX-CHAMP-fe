"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock3, Info, Pencil, Plus, Star, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, btnSmall, cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { BREAK_KINDS, type BreakKind, type ShiftView } from "@/features/shifts/types";
import { BREAK_LABEL, BREAK_SHORT_LABEL } from "@/features/shifts/lib/draft";
import { formatHmRange, formatLength, shiftLengthMinutes } from "@/features/shifts/lib/time";
import { formatWorkDays } from "@/features/shifts/lib/workDays";
import { useMakeDefaultShift, useShifts } from "@/features/shifts/hooks/useShifts";
import { BreakSummary, DefaultBadge } from "@/features/shifts/components/ShiftBadges";
import { DeleteShiftDialog } from "@/features/shifts/components/DeleteShiftDialog";

function hoursLabel(s: ShiftView): string {
  const length = formatLength(shiftLengthMinutes(s.start, s.end));
  return `${length}${s.overnight ? ", ends next day" : ""}`;
}

function UsageSummary({ shift }: { shift: ShiftView }) {
  const { people, departments, overrides } = shift.usage;
  const bits = [
    `${people} ${people === 1 ? "person" : "people"} today`,
    overrides ? `${overrides} ${overrides === 1 ? "override" : "overrides"}` : null,
  ].filter(Boolean);
  return (
    <div className="min-w-0">
      <p className="truncate text-slate-900" title={departments.join(", ") || undefined}>
        {departments.length
          ? departments.join(", ")
          : shift.isDefault
            ? "Everyone else"
            : "No department"}
      </p>
      <p className="text-xs text-slate-500">{bits.join(" · ")}</p>
    </div>
  );
}

/** Header cells set their own horizontal padding; the table is tight at 1280px. */
const th = "py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600";

function breakOf(shift: ShiftView, kind: BreakKind) {
  return shift.breaks.find((b) => b.kind === kind);
}

export function ShiftsList({ canEdit }: { canEdit: boolean }) {
  const { data: shifts, isLoading, isError, error, refetch, isFetching } = useShifts();
  const [deleting, setDeleting] = useState<ShiftView | null>(null);
  const [makingDefault, setMakingDefault] = useState<ShiftView | null>(null);
  const makeDefault = useMakeDefaultShift();

  const defaultShift = shifts?.find((s) => s.isDefault);

  async function confirmDefault() {
    if (!makingDefault) return;
    try {
      await makeDefault.mutateAsync(makingDefault.id);
      toast.success("Default shift changed", {
        description: `${makingDefault.name} is now the default shift.`,
      });
      setMakingDefault(null);
    } catch (err) {
      toast.error("Couldn't change the default shift", {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  function actionsFor(s: ShiftView) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Link href={`/dashboard/shifts/edit/${s.id}`} className={btnSmall}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit
        </Link>
        <ActionMenu
          label={`More actions for ${s.name}`}
          items={[
            {
              label: "Make default",
              icon: Star,
              disabled: s.isDefault,
              onSelect: () => setMakingDefault(s),
            },
            {
              label: "Delete",
              icon: Trash2,
              destructive: true,
              onSelect: () => setDeleting(s),
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Shifts"
          subtitle="Each shift sets working hours and three daily breaks. Assign shifts to departments, or override them for one person."
        />
        {canEdit && (
          <Link href="/dashboard/shifts/new" className={`${btnPrimary} shrink-0`}>
            <Plus className="h-4 w-4" aria-hidden />
            New shift
          </Link>
        )}
      </div>

      {defaultShift && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <Star className="h-4 w-4 shrink-0 text-[rgb(34_34_204)]" aria-hidden />
          <span>Default shift:</span>
          <span className="font-semibold text-slate-900">{defaultShift.name}</span>
          <span>
            ({formatHmRange(defaultShift.start, defaultShift.end)}). It applies to anyone whose
            department has no shift.
          </span>
        </div>
      )}
      {!canEdit && (
        <p className="flex items-start gap-2 text-sm text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Only the Admin changes shifts and who works them. Ask them under Messages.
        </p>
      )}

      <section className={cardBase} aria-label="Shifts">
        {isLoading ? (
          <LoadingState label="Loading shifts…" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load shifts"
            message={errorMessage(error)}
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : !shifts || shifts.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title="No shifts yet"
            message={
              canEdit
                ? "Create the first one. It becomes the default for everyone."
                : "The Admin hasn't set up any shifts yet."
            }
            action={
              canEdit ? (
                <Link href="/dashboard/shifts/new" className={btnPrimary}>
                  <Plus className="h-4 w-4" aria-hidden />
                  New shift
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Phones and small tablets: one card per shift. */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {shifts.map((s) => (
                <li key={s.id} className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-slate-900">{s.name}</h3>
                        {s.isDefault && <DefaultBadge />}
                      </div>
                      <p className="mt-0.5 text-sm tabular-nums text-slate-600">
                        {formatHmRange(s.start, s.end)} · {hoursLabel(s)}
                      </p>
                      <p className="text-sm text-slate-500">{formatWorkDays(s.workDays)}</p>
                    </div>
                    {canEdit && <div className="shrink-0">{actionsFor(s)}</div>}
                  </div>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {BREAK_KINDS.map((kind) => (
                      <div key={kind} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {BREAK_SHORT_LABEL[kind]}
                        </dt>
                        <dd className="mt-0.5">
                          <BreakSummary brk={breakOf(s, kind)} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex items-start gap-2 text-sm">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <UsageSummary shift={s} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Wide screens: a table, scrolling inside its card if it must. */}
            <div className="relative hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[840px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th scope="col" className={`${th} pl-5`}>
                      Shift
                    </th>
                    <th scope="col" className={`${th} px-3`}>
                      Hours
                    </th>
                    {BREAK_KINDS.map((kind) => (
                      <th key={kind} scope="col" className={`${th} px-3`}>
                        {BREAK_LABEL[kind]}
                      </th>
                    ))}
                    <th scope="col" className={`${th} px-3`}>
                      Applies to
                    </th>
                    {canEdit && (
                      <th scope="col" className={`${th} pl-2 pr-5 text-right`}>
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 align-top last:border-0">
                      <td className="py-4 pl-5 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{s.name}</span>
                          {s.isDefault && <DefaultBadge />}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <p className="whitespace-nowrap font-semibold tabular-nums text-slate-900">
                          {formatHmRange(s.start, s.end)}
                        </p>
                        <p className="text-xs text-slate-500">{hoursLabel(s)}</p>
                        <p className="whitespace-nowrap text-xs text-slate-500">
                          {formatWorkDays(s.workDays)}
                        </p>
                      </td>
                      {BREAK_KINDS.map((kind) => (
                        <td key={kind} className="px-3 py-4">
                          <BreakSummary brk={breakOf(s, kind)} />
                        </td>
                      ))}
                      <td className="max-w-[12rem] px-3 py-4">
                        <UsageSummary shift={s} />
                      </td>
                      {canEdit && <td className="py-4 pl-2 pr-5">{actionsFor(s)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <p className="text-sm text-slate-500">
        &quot;Can start&quot; is each break&apos;s window: when it may be started. Outside the
        window the desktop app won&apos;t start the break, and it counts as skipped.
      </p>

      <DeleteShiftDialog shift={deleting} onClose={() => setDeleting(null)} />
      <ConfirmDialog
        open={makingDefault !== null}
        onClose={() => {
          if (!makeDefault.isPending) setMakingDefault(null);
        }}
        onConfirm={confirmDefault}
        loading={makeDefault.isPending}
        icon={Star}
        title="Change the default shift?"
        confirmLabel={makeDefault.isPending ? "Saving…" : "Make default"}
        description={
          makingDefault ? (
            <>
              <span className="font-semibold text-slate-700">{makingDefault.name}</span> (
              {formatHmRange(makingDefault.start, makingDefault.end)}) will apply straight away to
              everyone whose department has no shift and who has no personal override.
            </>
          ) : null
        }
      />
    </div>
  );
}
