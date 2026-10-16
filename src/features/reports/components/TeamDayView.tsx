"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Users } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshFailedNotice,
} from "@/components/ui/StatePanel";
import { cardBase, thBase } from "@/components/ui/classes";
import { errorMessage, errorStatus } from "@/lib/api";
import { ROUNDING_NOTE, formatDuration, formatSignedAmount } from "@/lib/format/duration";
import { withReturnTo } from "@/lib/nav/returnTo";
import { hmOf, todayKey } from "@/lib/time/businessTime";
import { formatMonth, monthOfDate } from "@/lib/time/months";
import { useTeamDayReport } from "@/features/reports/hooks/useReports";
import { periodLabel, stepPeriod } from "@/features/reports/lib/period";
import {
  DayClassChip,
  Kpi,
  KpiGrid,
  ReportSection,
} from "@/features/reports/components/ReportParts";
import { PrintButton, ReportShell, type Crumb } from "@/features/reports/components/ReportShell";
import type { PersonDaySummary, ReportPerson, TeamDayParams } from "@/features/reports/types";

function span(s: PersonDaySummary): string {
  if (!s.startedAt) return "";
  return `${hmOf(s.startedAt)} to ${s.endedAt ? hmOf(s.endedAt) : "now"}`;
}

function pending(s: PersonDaySummary): string | null {
  const parts: string[] = [];
  if (s.pendingPlusSec >= 60) parts.push(`${formatSignedAmount(s.pendingPlusSec)} if approved`);
  if (s.pendingMinusSec >= 60) parts.push(`${formatSignedAmount(-s.pendingMinusSec)} if rejected`);
  return parts.length ? parts.join(", ") : null;
}

function breaks(s: PersonDaySummary): string {
  const parts = [`${s.breaksTaken} taken`];
  if (s.skipped + s.autoSkipped) parts.push(`${s.skipped + s.autoSkipped} skipped`);
  if (s.overruns) parts.push(`${s.overruns} over`);
  return parts.join(" · ");
}

/** Several people, one day: who started when, focus time, breaks and what is still pending. */
export function TeamDayView({
  params,
  back,
  autoPrint,
}: {
  params: TeamDayParams;
  back: { href: string; label: string } | null;
  autoPrint: boolean;
}) {
  const router = useRouter();
  const today = todayKey();
  const query = useTeamDayReport(params);
  const report = query.data;
  const date = params.date;
  const label = periodLabel({ kind: "day", date }, today);

  const rows = useMemo(
    () =>
      [...(report?.rows ?? [])]
        .filter((r): r is { person: ReportPerson; summary: PersonDaySummary } =>
          Boolean(r?.person && r?.summary),
        )
        .sort((a, b) => a.person.name.localeCompare(b.person.name)),
    [report],
  );

  function go(d: string) {
    const search = new URLSearchParams({ date: d });
    if (params.userIds?.length) search.set("userIds", params.userIds.join(","));
    router.replace(`/dashboard/reports/team?${search.toString()}`, { scroll: false });
  }
  const prev = stepPeriod({ kind: "day", date }, -1, today);
  const next = stepPeriod({ kind: "day", date }, 1, today);
  const personHref = (id: string) =>
    withReturnTo(
      `/dashboard/reports/person/${encodeURIComponent(id)}?date=${date}`,
      `/dashboard/reports/team?date=${date}${params.userIds?.length ? `&userIds=${params.userIds.join(",")}` : ""}`,
      "Team day report",
    );

  const crumbs: Crumb[] = [
    { label: "Reports", href: "/dashboard/reports" },
    {
      label: formatMonth(monthOfDate(date)),
      href: `/dashboard/reports/team?month=${monthOfDate(date)}`,
    },
    { label },
  ];

  const shell = (children: ReactNode) => (
    <ReportShell
      crumbs={crumbs}
      back={back}
      title={label.replace(", today", "")}
      subtitle={
        params.userIds?.length
          ? `${params.userIds.length} people · ${label}`
          : `Everyone in your reports · ${label}`
      }
      stepper={{
        label: label.replace(", today", ""),
        prevLabel: "Previous day",
        nextLabel: "Next day",
        onPrev: prev?.kind === "day" ? () => go(prev.date) : undefined,
        onNext: next?.kind === "day" ? () => go(next.date) : undefined,
      }}
      actions={<PrintButton disabled={!report} />}
      autoPrint={autoPrint}
      ready={Boolean(report) && !query.isPlaceholderData}
    >
      {children}
    </ReportShell>
  );

  if (query.isLoading) {
    return shell(
      <div className={cardBase}>
        <LoadingState label="Loading the day report…" />
      </div>,
    );
  }
  // A failed refresh keeps the report on screen (see the notice below); only a
  // report that never loaded shows the error.
  if (!report) {
    const status = errorStatus(query.error);
    return shell(
      <div className={cardBase}>
        {status === 400 || status === 403 ? (
          <EmptyState
            icon={Info}
            title="Can't show this day"
            message={errorMessage(query.error) ?? "Pick another day or other people from Reports."}
          />
        ) : (
          <ErrorState
            title="Couldn't load the day report"
            message={errorMessage(query.error)}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        )}
      </div>,
    );
  }

  const started = rows.filter((r) => r.summary.startedAt).length;
  // Exact seconds, rounded once when shown, like every other payroll total.
  const focus = rows.reduce((s, r) => s + Math.max(0, r.summary.focusSec), 0);
  const late = rows.filter((r) => r.summary.lateStart && r.summary.lateStart.minutes > 0).length;
  const pendingCount = rows.reduce((s, r) => s + Math.max(0, r.summary.pending), 0);
  const quiet = rows.reduce((s, r) => s + Math.max(0, r.summary.quietHours), 0);
  const cls = (c: string) => rows.filter((r) => r.summary.dayClass === c).length;

  return shell(
    <div className={`space-y-5 ${query.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`}>
      {query.isError && (
        <RefreshFailedNotice
          what="this report"
          updatedAt={query.dataUpdatedAt}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      )}
      {rows.length === 0 ? (
        <div className={cardBase}>
          <EmptyState
            icon={Users}
            title="Nobody in this report"
            message="Pick other people from Reports."
          />
        </div>
      ) : (
        <>
          <KpiGrid>
            <Kpi
              label="Started the day"
              value={`${started} of ${rows.length}`}
              sub={`${late} late ${late === 1 ? "start" : "starts"}`}
            />
            <Kpi
              label="Focus time"
              value={formatDuration(focus)}
              sub={
                started
                  ? `${formatDuration(focus / started)} a person who started`
                  : "Nobody started"
              }
            />
            <Kpi
              label="Attendance"
              value={`${cls("FULL")} full`}
              sub={`${cls("HALF")} half · ${cls("ABSENT")} absent${cls("IN_PROGRESS") ? ` · ${cls("IN_PROGRESS")} still working` : ""}`}
            />
            <Kpi
              label="Approvals open"
              value={String(pendingCount)}
              tone={pendingCount ? "warning" : "default"}
              sub={pendingCount ? "Decide them in Approvals" : "Everything decided"}
            />
            <Kpi
              label="Quiet hours"
              managersOnly
              value={String(quiet)}
              tone={quiet ? "warning" : "default"}
              sub="Never changes focus time"
            />
          </KpiGrid>

          <ReportSection
            title="Everyone"
            subtitle="Open a name for the full day with its timeline."
            flush
          >
            {/* Cards below xl: the table needs about 720px, more than the card has
                beside the sidebar at 1024px. */}
            <ul className="divide-y divide-slate-100 border-t border-slate-100 xl:hidden print:hidden">
              {rows.map(({ person, summary: s }) => (
                <li key={person.id} className="space-y-1.5 px-4 py-3 sm:px-6">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={personHref(person.id)}
                      className="min-w-0 break-words font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                    >
                      {person.name}
                    </Link>
                    <DayClassChip dayClass={s.dayClass} />
                  </div>
                  <p className="text-xs text-slate-600">
                    {span(s) || "Did not start"}
                    {s.lateStart && s.lateStart.minutes > 0
                      ? ` · ${s.lateStart.minutes} min late`
                      : ""}{" "}
                    · focus{" "}
                    <span className="font-semibold text-slate-900">
                      {formatDuration(s.focusSec)}
                    </span>{" "}
                    · {breaks(s)}
                  </p>
                  {pending(s) && (
                    <p className="text-xs font-semibold text-amber-700">{pending(s)}</p>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto xl:block print:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50/70">
                    <th scope="col" className={`${thBase} pl-6`}>
                      Person
                    </th>
                    <th scope="col" className={thBase}>
                      Attendance
                    </th>
                    <th scope="col" className={thBase}>
                      Day
                    </th>
                    <th scope="col" className={`${thBase} text-right`}>
                      Focus
                    </th>
                    <th scope="col" className={thBase}>
                      Breaks
                    </th>
                    <th scope="col" className={`${thBase} text-right`}>
                      Meetings
                    </th>
                    <th scope="col" className={`${thBase} pr-6 text-right`}>
                      Open
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ person, summary: s }) => (
                    <tr
                      key={person.id}
                      className="border-b border-slate-100 align-top last:border-b-0"
                    >
                      <th scope="row" className="py-2.5 pl-6 pr-4 text-left font-normal">
                        <Link
                          href={personHref(person.id)}
                          className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                        >
                          {person.name}
                        </Link>
                        {person.department && (
                          <span className="block text-xs text-slate-500">{person.department}</span>
                        )}
                      </th>
                      <td className="px-4 py-2.5">
                        <DayClassChip dayClass={s.dayClass} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-700">
                        {span(s) || <span className="text-slate-400">Did not start</span>}
                        {s.lateStart && s.lateStart.minutes > 0 && (
                          <span className="block text-xs font-semibold text-amber-700">
                            {s.lateStart.minutes} min late
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                        <span className="font-semibold text-slate-900">
                          {formatDuration(s.focusSec)}
                        </span>
                        {s.expectedSec > 0 && (
                          <span className="block text-xs text-slate-500">
                            of {formatDuration(s.expectedSec)}
                          </span>
                        )}
                        {pending(s) && (
                          <span className="block text-xs font-semibold text-amber-700">
                            {pending(s)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{breaks(s)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {s.meetings ? `${s.meetings} · ${formatDuration(s.meetingSec)}` : "None"}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pl-4 pr-6 text-right">
                        {s.pending > 0 ? (
                          <Chip tone="warning" dot>
                            {s.pending} open
                          </Chip>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6">
              {ROUNDING_NOTE}
            </p>
          </ReportSection>
        </>
      )}
    </div>,
  );
}
