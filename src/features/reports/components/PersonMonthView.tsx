"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshFailedNotice,
} from "@/components/ui/StatePanel";
import { cardBase, thBase } from "@/components/ui/classes";
import { errorMessage, errorStatus } from "@/lib/api";
import {
  formatDuration,
  formatSignedAmount,
  formatSignedDuration,
  ROUNDING_NOTE,
} from "@/lib/format/duration";
import { formatDayWithWeekday, hmOf, todayKey } from "@/lib/time/businessTime";
import { formatMonth } from "@/lib/time/months";
import { roleLabel } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { useAppSettings } from "@/features/settings/hooks/useSettings";
import { usePersonMonthReport } from "@/features/reports/hooks/useReports";
import { downloadPersonMonthXlsx } from "@/features/reports/api/reports";
import { periodLabel, stepPeriod } from "@/features/reports/lib/period";
import { FocusByDayChart, MonthHeatmap } from "@/features/reports/components/MonthCharts";
import {
  DayClassChip,
  Kpi,
  KpiGrid,
  ManagersOnly,
  ReportSection,
} from "@/features/reports/components/ReportParts";
import { MonthLockChip, MonthLockControl } from "@/features/reports/components/MonthLockControl";
import {
  ExcelButton,
  PrintButton,
  ReportShell,
  type Crumb,
} from "@/features/reports/components/ReportShell";
import type { PersonDaySummary, PersonMonthReport } from "@/features/reports/types";

function personLine(r: PersonMonthReport): string {
  const p = r.person;
  return [roleLabel(p.role), p.department, p.managerName ? `Manager ${p.managerName}` : null]
    .filter(Boolean)
    .join(" · ");
}

function breaksText(d: PersonDaySummary): string {
  const parts: string[] = [];
  if (d.breaksTaken) parts.push(`${d.breaksTaken} taken`);
  if (d.skipped) parts.push(`${d.skipped} skipped`);
  if (d.autoSkipped) parts.push(`${d.autoSkipped} auto-skipped`);
  if (d.overruns) parts.push(`${d.overruns} over`);
  return parts.join(" · ") || "None";
}

function pendingText(d: PersonDaySummary): string | null {
  const parts: string[] = [];
  if (d.pendingPlusSec >= 60) parts.push(`${formatSignedAmount(d.pendingPlusSec)} if approved`);
  if (d.pendingMinusSec >= 60) parts.push(`${formatSignedAmount(-d.pendingMinusSec)} if rejected`);
  return parts.length ? parts.join(", ") : null;
}

function worked(d: PersonDaySummary): boolean {
  return Boolean(d.startedAt) || d.focusSec > 0;
}

/**
 * Every day of the month: a table from xl up, cards below (the seven columns
 * need about 800px, more than the card has beside the sidebar at 1024px).
 */
function DaysTable({ days, userId }: { days: PersonDaySummary[]; userId: string }) {
  const href = (date: string) =>
    `/dashboard/reports/person/${encodeURIComponent(userId)}?date=${date}`;
  return (
    <>
      <ul className="divide-y divide-slate-100 border-t border-slate-100 xl:hidden print:hidden">
        {days.map((d) => (
          <li
            key={d.date}
            className={`space-y-1.5 px-4 py-3 sm:px-6 ${d.workday ? "" : "bg-slate-50/60"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Link
                  href={href(d.date)}
                  className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                >
                  {formatDayWithWeekday(d.date)}
                </Link>
                <DayClassChip dayClass={d.dayClass} />
              </span>
              {worked(d) && (
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {formatDuration(d.focusSec)}
                </span>
              )}
            </div>
            {worked(d) && (
              <p className="text-xs text-slate-600">
                {d.startedAt
                  ? `${hmOf(d.startedAt)} to ${d.endedAt ? hmOf(d.endedAt) : "now"}`
                  : ""}
                {d.lateStart && d.lateStart.minutes > 0 ? ` · ${d.lateStart.minutes} min late` : ""}
                {` · breaks ${breaksText(d).toLowerCase()}`}
                {d.meetings ? ` · ${d.meetings} ${d.meetings === 1 ? "meeting" : "meetings"}` : ""}
                {d.quietHours ? ` · ${d.quietHours} quiet` : ""}
              </p>
            )}
            {pendingText(d) && (
              <p className="text-xs font-semibold text-amber-700">{pendingText(d)}</p>
            )}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto xl:block print:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50/70">
              <th scope="col" className={`${thBase} pl-6`}>
                Date
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
                Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr
                key={d.date}
                className={`border-b border-slate-100 align-top last:border-b-0 ${
                  d.workday ? "" : "bg-slate-50/60"
                }`}
              >
                <th
                  scope="row"
                  className="whitespace-nowrap py-2.5 pl-6 pr-4 text-left font-normal"
                >
                  <Link
                    href={href(d.date)}
                    className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                  >
                    {formatDayWithWeekday(d.date)}
                  </Link>
                </th>
                <td className="px-4 py-2.5">
                  <DayClassChip dayClass={d.dayClass} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-700">
                  {d.startedAt
                    ? `${hmOf(d.startedAt)} to ${d.endedAt ? hmOf(d.endedAt) : "now"}`
                    : ""}
                  {d.lateStart && d.lateStart.minutes > 0 && (
                    <span className="block text-xs font-semibold text-amber-700">
                      {d.lateStart.minutes} min late
                    </span>
                  )}
                  {d.autoClosed && (
                    <span className="block text-xs text-slate-500">closed automatically</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                  {worked(d) && (
                    <span className="font-semibold text-slate-900">
                      {formatDuration(d.focusSec)}
                    </span>
                  )}
                  {pendingText(d) && (
                    <span className="block text-xs font-semibold text-amber-700">
                      {pendingText(d)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">
                  {worked(d) ? breaksText(d) : ""}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700">
                  {d.meetings ? `${d.meetings} · ${formatDuration(d.meetingSec)}` : ""}
                </td>
                <td className="whitespace-nowrap py-2.5 pl-4 pr-6 text-right tabular-nums text-slate-700">
                  {worked(d) ? `${formatDuration(d.activeMin * 60)}` : ""}
                  {d.quietHours > 0 && (
                    <span className="block text-xs font-semibold text-amber-700">
                      {d.quietHours} quiet
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * One person, one month: the totals payroll needs, focus day by day, every
 * day's attendance, and when they were active (managers only), with the
 * needs-a-look flag when quiet hours add up.
 */
export function PersonMonthView({
  userId,
  month,
  back,
  autoPrint,
}: {
  userId: string;
  month: string;
  back: { href: string; label: string } | null;
  autoPrint: boolean;
}) {
  const router = useRouter();
  const { role } = useSession();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const today = todayKey();
  const query = usePersonMonthReport(userId, month);
  const settings = useAppSettings();
  const report = query.data;
  const name = report?.person.name ?? "Month report";
  const label = periodLabel({ kind: "month", month }, today);

  const go = (m: string) =>
    router.replace(`/dashboard/reports/person/${encodeURIComponent(userId)}?month=${m}`, {
      scroll: false,
    });
  const prev = stepPeriod({ kind: "month", month }, -1, today);
  const next = stepPeriod({ kind: "month", month }, 1, today);

  const crumbs: Crumb[] = [
    { label: "Reports", href: "/dashboard/reports" },
    { label: `${formatMonth(month)}`, href: `/dashboard/reports/team?month=${month}` },
    { label: name },
  ];

  const shell = (children: ReactNode) => (
    <ReportShell
      crumbs={crumbs}
      back={back}
      title={name}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{report ? `${personLine(report)} · ${label}` : label}</span>
          {report && (
            <span className="print:hidden">
              {/* Their own open approvals, as in the banner below. */}
              <MonthLockChip month={month} pending={report.totals.pending} />
            </span>
          )}
        </span>
      }
      stepper={{
        label: formatMonth(month),
        prevLabel: "Previous month",
        nextLabel: "Next month",
        onPrev: prev?.kind === "month" ? () => go(prev.month) : undefined,
        onNext: next?.kind === "month" ? () => go(next.month) : undefined,
      }}
      actions={
        <>
          <PrintButton disabled={!report} />
          <ExcelButton
            disabled={!report}
            download={() => downloadPersonMonthXlsx(userId, month, report?.person.name)}
          />
          {isSuperAdmin && <MonthLockControl month={month} />}
        </>
      }
      autoPrint={autoPrint}
      ready={Boolean(report) && !query.isPlaceholderData}
    >
      {children}
    </ReportShell>
  );

  if (query.isLoading) {
    return shell(
      <div className={cardBase}>
        <LoadingState label="Loading the month report…" />
      </div>,
    );
  }
  // A failed refresh keeps the report on screen (see the notice below); only a
  // report that never loaded shows the error.
  if (!report) {
    const status = errorStatus(query.error);
    return shell(
      <div className={cardBase}>
        {status === 403 || status === 404 || status === 400 ? (
          <EmptyState
            icon={Info}
            title={
              status === 403
                ? "Not in your reports"
                : status === 400
                  ? "No report for this month"
                  : "No such person"
            }
            message={
              status === 403
                ? "You can report on the people who report to you."
                : status === 400
                  ? (errorMessage(query.error) ??
                    "Reports run from the first working day to this month.")
                  : "They may have been removed. Pick someone else from Reports."
            }
          />
        ) : (
          <ErrorState
            title="Couldn't load the month report"
            message={errorMessage(query.error)}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        )}
      </div>,
    );
  }

  const t = report.totals;
  const expected = Math.max(0, t.expectedSec);
  const pct = expected ? Math.round((t.focusSec / expected) * 100) : 0;
  const attendanceDays = t.full + t.half / 2;
  const net = t.approvedPlusSec - t.rejectedMinusSec;
  const flagAt = settings.data?.quietHoursFlag ?? 4;
  const sorted = [...report.days].sort((a, b) => a.date.localeCompare(b.date));

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
      {t.pending > 0 && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            <span className="font-semibold">
              {t.pending} {t.pending === 1 ? "approval is" : "approvals are"} still open.
            </span>{" "}
            Decide {t.pending === 1 ? "it" : "them"} so {formatMonth(month)} can be locked for
            payroll.
          </p>
          <Link
            href="/dashboard/approvals"
            className="shrink-0 font-semibold text-amber-900 underline underline-offset-2 print:hidden"
          >
            Review approvals
          </Link>
        </div>
      )}
      {t.needsALook && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            <span className="font-semibold text-amber-800">Needs a look.</span> {t.quietHours} quiet
            hours this month ({flagAt} or more flags it). A quiet hour is an hour with little
            keyboard and mouse activity and no break or meeting logged. It never changes focus time.
          </span>
        </div>
      )}

      <KpiGrid>
        <Kpi
          label="Focus time, for payroll"
          value={formatDuration(t.focusSec)}
          meter={expected ? Math.min(100, pct) : undefined}
          sub={`${pct}% of ${formatDuration(expected)} expected · ${formatDuration(t.avgFocusSec)} a working day`}
        />
        <Kpi
          label="Attendance"
          value={`${attendanceDays} ${attendanceDays === 1 ? "day" : "days"}`}
          sub={`of ${t.workdays} working days: ${t.full} full, ${t.half} half, ${t.absent} absent${
            t.extra ? `, ${t.extra} extra` : ""
          } · ${t.lateStarts} late ${t.lateStarts === 1 ? "start" : "starts"}`}
        />
        <Kpi
          label="Approvals changed focus by"
          value={formatSignedDuration(net)}
          tone={net < 0 ? "danger" : net > 0 ? "success" : "default"}
          sub={`${formatSignedAmount(t.approvedPlusSec)} approved back · ${formatSignedAmount(-t.rejectedMinusSec)} taken off · ${t.pending} still open`}
        />
        <Kpi
          label="Skipped breaks"
          value={String(t.skipped + t.autoSkipped)}
          sub={`${t.skipped} with a reason, ${t.autoSkipped} auto-skipped · counted as focus unless rejected`}
        />
        <Kpi
          label="Meetings and overruns"
          value={`${t.meetings} ${t.meetings === 1 ? "meeting" : "meetings"}`}
          sub={`${t.overruns} ${t.overruns === 1 ? "break" : "breaks"} ran over`}
        />
        <Kpi
          label="Quiet hours"
          managersOnly
          value={String(t.quietHours)}
          tone={t.needsALook ? "warning" : "default"}
          sub={t.needsALook ? `Needs a look (${flagAt} or more)` : `Flagged from ${flagAt}`}
        />
      </KpiGrid>

      <ReportSection
        title="Focus time, day by day"
        subtitle="Start of day to end of day, minus breaks, after decisions."
      >
        <FocusByDayChart days={sorted} />
      </ReportSection>

      <ReportSection
        title="Every day"
        subtitle={`${t.workdays} working days · times in the business time zone · open a day for its timeline`}
        flush
      >
        <DaysTable days={sorted} userId={userId} />
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6">
          {ROUNDING_NOTE}
        </p>
      </ReportSection>

      <ReportSection
        title="Keyboard and mouse activity, by hour"
        subtitle="Active minutes in each hour of each day. It never changes focus time."
        aside={<ManagersOnly />}
      >
        <MonthHeatmap heatmap={report.heatmap} days={sorted} />
      </ReportSection>
    </div>,
  );
}
