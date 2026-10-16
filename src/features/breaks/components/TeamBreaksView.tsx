"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Coffee, Users } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnGhost, cardBase, thBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { addDaysToKey, formatDayWithWeekday, hmOf, todayKey } from "@/lib/time/businessTime";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { BREAK_KINDS, type BreakKind } from "@/features/shifts/types";
import { BREAK_SHORT_LABEL } from "@/features/shifts/lib/draft";
import { SourceChip, shiftRefLabel } from "@/features/shifts/components/ShiftBadges";
import { useReportsToOptions } from "@/features/users/hooks/useReportsToOptions";
import { isSkipRecord, overrunLabel, tookLabel } from "@/features/breaks/lib/labels";
import { useTeamBreaks } from "@/features/breaks/hooks/useTeamBreaks";
import { ApprovalChip, CellStatusChip, TimingChip } from "@/features/breaks/components/BreakChips";
import type {
  BreakRecordView,
  TeamBreakCellView,
  TeamBreakRowView,
  TeamBreakTotals,
} from "@/features/breaks/types";

const EVERYONE = "__everyone__";

function TakenDetails({ record }: { record: BreakRecordView }) {
  if (isSkipRecord(record)) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-slate-600">
          {record.outcome === "AUTO_SKIPPED" ? "Auto-skipped" : "Skipped"} at{" "}
          {hmOf(record.startedAt)}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <ApprovalChip status={record.approvalStatus} />
          {record.needsComment && <Chip tone="warning">No comment yet</Chip>}
        </div>
      </div>
    );
  }
  const overrun = overrunLabel(record);
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-600">
        Started {hmOf(record.startedAt)} · {tookLabel(record)}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <TimingChip record={record} />
        <ApprovalChip status={record.approvalStatus} />
        {overrun && <Chip tone="danger">{overrun}</Chip>}
      </div>
    </div>
  );
}

function Cell({ cell }: { cell: TeamBreakCellView | undefined }) {
  if (!cell) return <span className="text-xs text-slate-400">Off for this shift</span>;
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold tabular-nums text-slate-900">{cell.localStart}</span>
        <CellStatusChip status={cell.status} />
      </div>
      {cell.record && <TakenDetails record={cell.record} />}
    </div>
  );
}

function noScheduleText(row: TeamBreakRowView): string {
  if (!row.shift) return "No shift";
  if (!row.workday) return "Day off";
  return "No breaks on this shift";
}

function Unscheduled({ records }: { records: BreakRecordView[] }) {
  if (!records.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Outside the schedule
      </p>
      {records.map((r) => (
        <div key={r.id} className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold text-slate-700">{r.label}</p>
          <TakenDetails record={r} />
        </div>
      ))}
    </div>
  );
}

function Totals({ totals }: { totals: TeamBreakTotals }) {
  const items: { label: string; value: number; tone?: string; hint?: ReactNode }[] = [
    { label: "People", value: totals.people },
    { label: "Taken", value: totals.taken },
    { label: "Late", value: totals.late, tone: totals.late ? "text-amber-700" : undefined },
    { label: "Early", value: totals.early, tone: totals.early ? "text-amber-700" : undefined },
    // 3.1: skip records (by hand or automatic) apart from windows that closed
    // with nothing recorded.
    { label: "Skipped", value: totals.skipped ?? 0 },
    { label: "Not taken", value: totals.missed },
    {
      label: "Ran over",
      value: totals.overrun,
      tone: totals.overrun ? "text-rose-600" : undefined,
    },
    {
      label: "Pending",
      value: totals.pending,
      tone: totals.pending ? "text-amber-700" : undefined,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-4 xl:grid-cols-8">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className={`mt-0.5 text-xl font-bold tabular-nums ${item.tone ?? "text-slate-900"}`}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function cellOf(row: TeamBreakRowView, kind: BreakKind) {
  return row.cells.find((c) => c.kind === kind);
}

/** One day of a team's breaks: who took what, when, late or early, skipped, running, pending. */
export function TeamBreaksView({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [team, setTeam] = useState(EVERYONE);
  const managers = useReportsToOptions(isSuperAdmin);

  const params = useMemo(
    () => ({
      date: date || undefined,
      managerId: isSuperAdmin && team !== EVERYONE ? team : undefined,
    }),
    [date, team, isSuperAdmin],
  );
  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } =
    useTeamBreaks(params);

  const teamOptions = useMemo<SelectOption[]>(
    () => [
      { value: EVERYONE, label: "Everyone", icon: Users },
      ...managers.options.map((o) => ({ ...o, label: `${o.label}'s team` })),
    ],
    [managers.options],
  );

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Team breaks"
          subtitle="Who took which break, when, who skipped one, and what is waiting for approval."
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isSuperAdmin && (
            <div className="sm:w-64">
              <Select
                value={team}
                onValueChange={setTeam}
                options={teamOptions}
                aria-label="Team"
                searchable
                searchPlaceholder="Search managers…"
                className="!mt-0 h-11 !py-0"
              />
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDate(addDaysToKey(date || today, -1))}
              className={btnGhost}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm">
              <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
              <span className="sr-only">Day</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value || today)}
                className="bg-transparent font-semibold text-slate-900 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setDate(addDaysToKey(date || today, 1))}
              className={btnGhost}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            {date !== today && (
              <button type="button" onClick={() => setDate(today)} className={btnGhost}>
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      {data && <Totals totals={data.totals} />}

      {data && data.totals.pending > 0 && (
        <p className="text-sm text-slate-600">
          {data.totals.pending} {data.totals.pending === 1 ? "break waits" : "breaks wait"} for a
          decision.{" "}
          <Link
            href="/dashboard/approvals"
            className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
          >
            Go to Approvals
          </Link>
        </p>
      )}

      <section className={cardBase} aria-label={`Breaks on ${formatDayWithWeekday(date)}`}>
        <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            {date === today ? "Today" : formatDayWithWeekday(date)}
            {date === today && " "}
            {date === today && (
              <span className="ml-1 text-sm font-normal text-slate-500">
                {formatDayWithWeekday(date)}
              </span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <LoadingState label="Loading team breaks…" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load team breaks"
            message={errorMessage(error)}
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Coffee}
            title="Nobody in this team"
            message={
              isSuperAdmin
                ? "Pick another team, or add people under Team Management."
                : "Staff who report to you will appear here."
            }
          />
        ) : (
          <div
            className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
          >
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((row) => (
                <li key={row.user.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{row.user.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {shiftRefLabel(row.shift)}
                        {row.user.department ? ` · ${row.user.department}` : ""}
                      </p>
                    </div>
                    {row.pending > 0 && (
                      <Chip tone="warning" dot>
                        {row.pending} pending
                      </Chip>
                    )}
                  </div>
                  {row.cells.length === 0 ? (
                    <p className="text-sm text-slate-500">{noScheduleText(row)}</p>
                  ) : (
                    <dl className="grid grid-cols-1 gap-2">
                      {BREAK_KINDS.map((kind) => (
                        <div
                          key={kind}
                          className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                        >
                          <dt className="w-16 shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {BREAK_SHORT_LABEL[kind]}
                          </dt>
                          <dd className="min-w-0 flex-1">
                            <Cell cell={cellOf(row, kind)} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <Unscheduled records={row.unscheduled} />
                </li>
              ))}
            </ul>

            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th scope="col" className={`${thBase} pl-6`}>
                      Person
                    </th>
                    {BREAK_KINDS.map((kind) => (
                      <th key={kind} scope="col" className={thBase}>
                        {BREAK_SHORT_LABEL[kind]}
                      </th>
                    ))}
                    <th scope="col" className={`${thBase} pr-6 text-right`}>
                      Pending
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Fragment key={row.user.id}>
                      <tr
                        className={`align-top ${
                          row.unscheduled.length ? "" : "border-b border-slate-100"
                        }`}
                      >
                        <th scope="row" className="w-64 py-4 pl-6 pr-4 text-left font-normal">
                          <p className="font-semibold text-slate-900">{row.user.name}</p>
                          <p className="text-xs text-slate-500">{shiftRefLabel(row.shift)}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <SourceChip source={row.source} />
                            {row.user.department && (
                              <span className="text-xs text-slate-500">{row.user.department}</span>
                            )}
                          </div>
                        </th>
                        {row.cells.length === 0 ? (
                          <td colSpan={3} className="px-4 py-4 text-sm text-slate-500">
                            {noScheduleText(row)}
                          </td>
                        ) : (
                          BREAK_KINDS.map((kind) => (
                            <td key={kind} className="px-4 py-4">
                              <Cell cell={cellOf(row, kind)} />
                            </td>
                          ))
                        )}
                        <td className="py-4 pl-4 pr-6 text-right">
                          {row.pending > 0 ? (
                            <Chip tone="warning" dot>
                              {row.pending}
                            </Chip>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                      {row.unscheduled.length > 0 && (
                        <tr className="border-b border-slate-100">
                          <td />
                          <td colSpan={4} className="px-4 pb-4">
                            <div className="max-w-xl">
                              <Unscheduled records={row.unscheduled} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
