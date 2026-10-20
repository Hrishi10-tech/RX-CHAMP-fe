"use client";

import { isOrgAdmin } from "@/constants/roles";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Info, Users } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshFailedNotice,
} from "@/components/ui/StatePanel";
import { btnGhost, cardBase, thBase } from "@/components/ui/classes";
import { errorMessage, errorStatus } from "@/lib/api";
import {
  formatDuration,
  formatSignedAmount,
  formatSignedDuration,
  ROUNDING_NOTE,
} from "@/lib/format/duration";
import { withReturnTo } from "@/lib/nav/returnTo";
import { todayKey } from "@/lib/time/businessTime";
import { formatMonth } from "@/lib/time/months";
import { useSession } from "@/features/auth/hooks/useSession";
import { useAppSettings } from "@/features/settings/hooks/useSettings";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useTeamMonthReport } from "@/features/reports/hooks/useReports";
import { downloadTeamMonthXlsx } from "@/features/reports/api/reports";
import { periodLabel, stepPeriod } from "@/features/reports/lib/period";
import { dayClassLook } from "@/features/reports/lib/labels";
import {
  ActivityGate,
  BreakRulesItems,
  Kpi,
  KpiGrid,
  ManagersOnly,
  ReportSection,
  paidTimeSub,
  unverifiedNote,
  useCanSeeActivity,
} from "@/features/reports/components/ReportParts";
import { MonthLockChip, MonthLockControl } from "@/features/reports/components/MonthLockControl";
import {
  ExcelButton,
  PrintButton,
  ReportShell,
  type Crumb,
} from "@/features/reports/components/ReportShell";
import type {
  DayClass,
  MonthTotals,
  TeamMonthRow,
  TeamMonthParams,
} from "@/features/reports/types";

type SortKey =
  | "name"
  | "focus"
  | "paid"
  | "pct"
  | "breaks"
  | "away"
  | "attendance"
  | "late"
  | "skipped"
  | "quiet"
  | "pending";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Person", numeric: false },
  { key: "focus", label: "Focus", numeric: true },
  { key: "pct", label: "Of target", numeric: true },
  { key: "paid", label: "Paid time", numeric: true },
  { key: "breaks", label: "Breaks", numeric: true },
  { key: "away", label: "Away", numeric: true },
  { key: "attendance", label: "Attendance", numeric: true },
  { key: "late", label: "Late · skipped", numeric: true },
  { key: "quiet", label: "Quiet hours", numeric: true },
  { key: "pending", label: "Open", numeric: true },
];

/**
 * Focus time as a share of expected; null when nothing was expected (no working
 * day in the period, such as someone who joined after it).
 */
function pctOf(t: MonthTotals): number | null {
  return t.expectedSec > 0 ? (t.focusSec / t.expectedSec) * 100 : null;
}

function attendanceDays(t: MonthTotals): number {
  return t.full + t.half / 2;
}

const SORTERS: Record<SortKey, (a: TeamMonthRow, b: TeamMonthRow) => number> = {
  name: (a, b) => a.person.name.localeCompare(b.person.name),
  focus: (a, b) => a.totals.focusSec - b.totals.focusSec,
  paid: (a, b) => a.totals.paidSec - b.totals.paidSec,
  pct: (a, b) => (pctOf(a.totals) ?? -1) - (pctOf(b.totals) ?? -1),
  breaks: (a, b) =>
    a.totals.paidBreakSec +
    a.totals.unpaidBreakSec -
    (b.totals.paidBreakSec + b.totals.unpaidBreakSec),
  away: (a, b) =>
    a.totals.awayApprovedSec +
    a.totals.awayPendingSec -
    (b.totals.awayApprovedSec + b.totals.awayPendingSec),
  attendance: (a, b) => attendanceDays(a.totals) - attendanceDays(b.totals),
  late: (a, b) => a.totals.lateStarts - b.totals.lateStarts,
  skipped: (a, b) =>
    a.totals.skipped + a.totals.autoSkipped - (b.totals.skipped + b.totals.autoSkipped),
  quiet: (a, b) => a.totals.quietHours - b.totals.quietHours,
  pending: (a, b) => a.totals.pending - b.totals.pending,
};

/** Sorts the ranking; ties fall back to the name so the order is stable. */
export function sortRows(rows: TeamMonthRow[], key: SortKey, dir: 1 | -1): TeamMonthRow[] {
  return [...rows].sort(
    (a, b) => SORTERS[key](a, b) * dir || a.person.name.localeCompare(b.person.name),
  );
}

const MIX: DayClass[] = ["FULL", "HALF", "ABSENT", "EXTRA"];

/** Person-days across the team by attendance class, as one stacked bar. */
function AttendanceMix({ totals }: { totals: MonthTotals }) {
  const counts: Record<string, number> = {
    FULL: totals.full,
    HALF: totals.half,
    ABSENT: totals.absent,
    EXTRA: totals.extra,
  };
  const total = MIX.reduce((s, c) => s + Math.max(0, counts[c]), 0);
  if (total === 0) return <p className="text-sm text-slate-500">No working days yet.</p>;
  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={MIX.map((c) => `${counts[c]} ${dayClassLook(c).label.toLowerCase()}`).join(
          ", ",
        )}
        className="flex h-6 w-full overflow-hidden rounded-lg bg-slate-100"
      >
        {MIX.filter((c) => counts[c] > 0).map((c) => (
          <span
            key={c}
            className={`h-full ${dayClassLook(c).cell}`}
            style={{ width: `${(counts[c] / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-700">
        {MIX.map((c) => (
          <li key={c} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${dayClassLook(c).cell}`} />
            {dayClassLook(c).label}
            <span className="font-semibold tabular-nums text-slate-900">{counts[c]}</span>
            <span className="text-xs text-slate-500">
              ({Math.round((counts[c] / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Person-days on working days, plus extra days worked on a day off.
      </p>
    </div>
  );
}

/** "Engineering · Manager": where a person sits (4.0 groups people by department). */
function personLine(r: TeamMonthRow): string {
  return [r.person.department, r.person.role === "MANAGER" ? "Manager" : null]
    .filter(Boolean)
    .join(" · ");
}

function Meter({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="text-xs text-slate-500" title="No working days in this period">
        No workdays
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        data-print-hide
        className="block h-1.5 w-12 overflow-hidden rounded-full bg-indigo-100"
      >
        <span
          className={`block h-full rounded-full ${pct < 90 ? "bg-amber-500" : "bg-indigo-600"}`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </span>
      <span className="tabular-nums">{Math.round(pct)}%</span>
    </span>
  );
}

function RankingTable({
  rows,
  month,
  flagAt,
  activity,
}: {
  rows: TeamMonthRow[];
  month: string;
  flagAt: number;
  /** Whether the viewer sees keyboard and mouse activity (quiet hours, SPEC 2.2). */
  activity: boolean;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "pct", dir: -1 });
  const [lookOnly, setLookOnly] = useState(false);
  const columns = activity ? COLUMNS : COLUMNS.filter((c) => c.key !== "quiet");
  const flagged = useMemo(
    () => (activity ? rows.filter((r) => r.totals.needsALook) : []),
    [rows, activity],
  );
  const shown = useMemo(
    () => sortRows(lookOnly ? flagged : rows, sort.key, sort.dir),
    [rows, flagged, lookOnly, sort],
  );
  const personHref = (id: string) =>
    withReturnTo(
      `/dashboard/reports/person/${encodeURIComponent(id)}?month=${month}`,
      `/dashboard/reports/team?month=${month}`,
      `${formatMonth(month)} team report`,
    );

  function sortBy(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 },
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 sm:px-6 print:hidden">
        <label className="flex items-center gap-2 text-sm text-slate-700 min-[1360px]:hidden">
          <span>Sort by</span>
          <select
            value={`${sort.key}:${sort.dir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":");
              setSort({ key: key as SortKey, dir: dir === "1" ? 1 : -1 });
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900"
          >
            <option value="pct:-1">Of expected, highest first</option>
            <option value="pct:1">Of expected, lowest first</option>
            <option value="focus:-1">Focus time</option>
            <option value="paid:-1">Paid time</option>
            {activity && <option value="quiet:-1">Quiet hours</option>}
            <option value="late:-1">Late starts</option>
            <option value="pending:-1">Open approvals</option>
            <option value="name:1">Name</option>
          </select>
        </label>
        {flagged.length > 0 && (
          <button
            type="button"
            aria-pressed={lookOnly}
            onClick={() => setLookOnly((v) => !v)}
            className={btnGhost}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {lookOnly ? "Show everyone" : `Only the ${flagged.length} who need a look`}
          </button>
        )}
      </div>

      {/* Cards below 1360px: the ten-column table needs about 1020px, more than
          the card has beside the sidebar on a 1024 to 1359px screen. */}
      <ul className="divide-y divide-slate-100 border-t border-slate-100 min-[1360px]:hidden print:hidden">
        {shown.map((r) => {
          const t = r.totals;
          return (
            <li key={r.person.id} className="space-y-1.5 px-4 py-3 sm:px-6">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={personHref(r.person.id)}
                  className="min-w-0 break-words font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                >
                  {r.person.name}
                </Link>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">
                  {formatDuration(t.focusSec)}
                </span>
              </div>
              <p className="text-xs text-slate-500">{personLine(r)}</p>
              <Meter pct={pctOf(t)} />
              <p className="text-xs text-slate-600">
                Month target {formatDuration(t.targetSec)} · paid time{" "}
                <span className="font-semibold text-slate-900">{formatDuration(t.paidSec)}</span>
                {unverifiedNote(t.unverifiedSec) ? ` · ${unverifiedNote(t.unverifiedSec)}` : ""} ·
                breaks {formatDuration(t.paidBreakSec)} paid, {formatDuration(t.unpaidBreakSec)}{" "}
                unpaid · away {formatDuration(t.awayApprovedSec)} approved
                {t.awayPendingSec > 0 ? `, ${formatDuration(t.awayPendingSec)} pending` : ""}
              </p>
              <p className="text-xs text-slate-600">
                {attendanceDays(t)} days: {t.full} full, {t.half} half, {t.absent} absent ·{" "}
                {t.lateStarts} late · {t.skipped + t.autoSkipped} skipped
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activity && t.quietHours > 0 && (
                  <Chip tone={t.needsALook ? "warning" : "neutral"}>
                    {t.quietHours} quiet {t.quietHours === 1 ? "hour" : "hours"}
                  </Chip>
                )}
                {activity && t.needsALook && <Chip tone="warning">Needs a look</Chip>}
                {t.pending > 0 && (
                  <Chip tone="warning" dot>
                    {t.pending} open
                  </Chip>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto min-[1360px]:block print:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50/70">
              {columns.map((c, i) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                    className={`${thBase} ${i === 0 ? "pl-6" : ""} ${i === columns.length - 1 ? "pr-6" : ""} ${
                      c.numeric ? "text-right" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => sortBy(c.key)}
                      className={`inline-flex items-center gap-1 rounded uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] print:hidden ${
                        active ? "text-slate-900" : ""
                      }`}
                    >
                      {c.label}
                      {active &&
                        (sort.dir === 1 ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        ))}
                    </button>
                    {/* Plain text on paper: the header repeats on every page, and a
                        button there prints as an empty band. */}
                    <span aria-hidden className="hidden uppercase print:inline">
                      {c.label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const t = r.totals;
              return (
                <tr
                  key={r.person.id}
                  className="border-b border-slate-100 align-top last:border-b-0"
                >
                  <th scope="row" className="py-2.5 pl-6 pr-4 text-left font-normal">
                    <Link
                      href={personHref(r.person.id)}
                      className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                    >
                      {r.person.name}
                    </Link>
                    <span className="block text-xs text-slate-500">{personLine(r)}</span>
                  </th>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {formatDuration(t.focusSec)}
                    <span className="block text-xs font-normal text-slate-500">
                      of {formatDuration(t.targetSec)}
                    </span>
                    {/* The note wraps, so the column stays narrow and the table fits. */}
                    {unverifiedNote(t.unverifiedSec) && (
                      <span className="block min-w-[5.5rem] whitespace-normal text-xs font-normal text-slate-500">
                        {unverifiedNote(t.unverifiedSec)}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <span className="inline-flex justify-end">
                      <Meter pct={pctOf(t)} />
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-900">
                    {formatDuration(t.paidSec)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    {formatDuration(t.paidBreakSec)}
                    <span className="block min-w-[5.5rem] whitespace-normal text-xs text-slate-500">
                      paid · {formatDuration(t.unpaidBreakSec)} unpaid
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    {formatDuration(t.awayApprovedSec)}
                    <span className="block min-w-[5.5rem] whitespace-normal text-xs text-slate-500">
                      approved
                      {t.awayPendingSec > 0 ? ` · ${formatDuration(t.awayPendingSec)} pending` : ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    {attendanceDays(t)} days
                    <span className="block min-w-[5.5rem] whitespace-normal text-xs text-slate-500">
                      {t.full} full · {t.half} half · {t.absent} absent
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    {t.lateStarts} · {t.skipped + t.autoSkipped}
                  </td>
                  {activity && (
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      <span className={t.needsALook ? "font-semibold text-amber-700" : ""}>
                        {t.quietHours}
                      </span>
                      {t.needsALook && (
                        <span className="block text-xs font-semibold text-amber-700">
                          Needs a look
                        </span>
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap py-2.5 pl-3 pr-6 text-right">
                    {t.pending > 0 ? (
                      <Chip tone="warning" dot>
                        {t.pending} open
                      </Chip>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="space-y-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6">
        {activity && flagged.length === 0 && (
          <span className="block">Nobody has {flagAt} or more quiet hours this month.</span>
        )}
        <span className="block">{ROUNDING_NOTE}</span>
      </p>
    </div>
  );
}

/**
 * A team (or everyone) for one month: totals for payroll, the attendance mix,
 * a sortable ranking with each person a click away, and who needs a look.
 */
export function TeamMonthView({
  params,
  back,
  autoPrint,
}: {
  params: TeamMonthParams;
  back: { href: string; label: string } | null;
  autoPrint: boolean;
}) {
  const router = useRouter();
  const { role } = useSession();
  const isSuperAdmin = isOrgAdmin(role);
  const today = todayKey();
  const query = useTeamMonthReport(params);
  const settings = useAppSettings();
  const activityAllowed = useCanSeeActivity();
  const departments = useDepartments(Boolean(params.departmentId));
  const department = params.departmentId
    ? departments.data?.find((d) => d.id === params.departmentId)
    : undefined;
  const report = query.data;
  const month = params.month;
  const label = periodLabel({ kind: "month", month }, today);
  const narrowed = Boolean(params.departmentId || params.userIds?.length);

  const scopeName = report
    ? !narrowed
      ? report.scope === "ALL"
        ? "Everyone"
        : "My departments"
      : params.departmentId
        ? (department?.name ?? "A department")
        : `${params.userIds?.length ?? 0} people`
    : "Team";

  function go(m: string) {
    const search = new URLSearchParams({ month: m });
    if (params.departmentId) search.set("departmentId", params.departmentId);
    if (params.userIds?.length) search.set("userIds", params.userIds.join(","));
    router.replace(`/dashboard/reports/team?${search.toString()}`, { scroll: false });
  }
  const prev = stepPeriod({ kind: "month", month }, -1, today);
  const next = stepPeriod({ kind: "month", month }, 1, today);

  const crumbs: Crumb[] = [
    { label: "Reports", href: "/dashboard/reports" },
    {
      label: `${formatMonth(month)}, ${scopeName.toLowerCase() === "everyone" ? "everyone" : scopeName}`,
    },
  ];

  const shell = (children: ReactNode) => (
    <ReportShell
      crumbs={crumbs}
      back={back}
      title={formatMonth(month)}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>
            {scopeName}
            {report
              ? ` · ${report.totals.people} ${report.totals.people === 1 ? "person" : "people"}`
              : ""}{" "}
            · {label}
          </span>
          {report && (
            <span className="print:hidden">
              {/* The open approvals of the people in this report, as in the banner. */}
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
          <ExcelButton disabled={!report} download={() => downloadTeamMonthXlsx(params)} />
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
        <LoadingState label="Loading the team report…" />
      </div>,
    );
  }
  // A failed refresh keeps the report on screen (see the notice below); only a
  // report that never loaded shows the error.
  if (!report) {
    const status = errorStatus(query.error);
    return shell(
      <div className={cardBase}>
        {status === 404 ? (
          <EmptyState
            icon={Info}
            title="Not in your reports"
            message="That department is not one of yours, or it has been deleted. Pick another from Reports."
          />
        ) : status === 400 || status === 403 ? (
          <EmptyState
            icon={Info}
            title={status === 400 ? "No report for this month" : "Not in your reports"}
            message={
              errorMessage(query.error) ?? "Pick another month or other people from Reports."
            }
          />
        ) : (
          <ErrorState
            title="Couldn't load the team report"
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
  const net = t.approvedPlusSec - t.rejectedMinusSec;
  const flagged = report.rows.filter((r) => r.totals.needsALook);
  const flagAt = settings.data?.quietHoursFlag ?? 4;
  const personDays = t.full + t.half + t.absent;
  const attendancePct = personDays ? ((t.full + t.half / 2) / personDays) * 100 : 0;
  const s = settings.data;

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
            {isSuperAdmin
              ? `Lock ${formatMonth(month)} for payroll once they are decided.`
              : `Decide them so ${formatMonth(month)} can be locked for payroll.`}
          </p>
          <Link
            href="/dashboard/approvals"
            className="shrink-0 font-semibold text-amber-900 underline underline-offset-2 print:hidden"
          >
            Review approvals
          </Link>
        </div>
      )}

      {report.rows.length === 0 ? (
        <div className={cardBase}>
          <EmptyState
            icon={Users}
            title="Nobody in this report"
            message="People appear once they have work sessions in the month."
          />
        </div>
      ) : (
        <>
          <KpiGrid wide>
            <Kpi
              label="Focus time"
              value={formatDuration(t.focusSec)}
              meter={expected ? Math.min(100, pct) : undefined}
              sub={[
                `${pct}% of ${formatDuration(expected)} target so far`,
                `month target ${formatDuration(t.targetSec)}`,
                `${formatDuration(t.avgFocusSec)} a working day`,
                unverifiedNote(t.unverifiedSec) &&
                  `${unverifiedNote(t.unverifiedSec)}, not counted`,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Kpi
              label="Paid time, for payroll"
              value={formatDuration(t.paidSec)}
              sub={paidTimeSub(t.paidBreakSec)}
            />
            <Kpi
              label="Breaks"
              value={`${formatDuration(t.paidBreakSec)} paid`}
              tone={t.unpaidBreakSec > 0 ? "warning" : "default"}
              sub={`${formatDuration(t.unpaidBreakSec)} unpaid · ${formatDuration(t.breakSec)} in all · meetings ${formatDuration(t.meetingSec)}`}
            />
            <Kpi
              label="Away with a reason"
              value={`${formatDuration(t.awayApprovedSec)} approved`}
              tone={t.awayPendingSec > 0 ? "warning" : "default"}
              sub={
                t.awayPendingSec > 0
                  ? `${formatDuration(t.awayPendingSec)} waiting: it counts as focus once approved`
                  : "Nothing waiting for a decision"
              }
            />
            <Kpi
              label="Attendance"
              value={`${attendancePct.toFixed(1)}%`}
              sub={`${t.full + t.half / 2} of ${personDays} person-days · ${t.half} half, ${t.absent} absent`}
            />
            <Kpi
              label="Approvals changed focus by"
              value={formatSignedDuration(net)}
              tone={net < 0 ? "danger" : net > 0 ? "success" : "default"}
              sub={`${formatSignedAmount(t.approvedPlusSec)} approved back · ${formatSignedAmount(-t.rejectedMinusSec)} taken off · ${t.pending} still open`}
            />
            <Kpi
              label="Late starts"
              value={String(t.lateStarts)}
              tone={t.lateStarts ? "warning" : "default"}
              sub="Reported only, focus time is not changed"
            />
            <Kpi
              label="Skipped breaks"
              value={String(t.skipped + t.autoSkipped)}
              sub={`${t.skipped} with a reason, ${t.autoSkipped} auto-skipped · ${t.overruns} ran over`}
            />
            <Kpi
              label="Needs a look"
              managersOnly
              value={`${flagged.length} ${flagged.length === 1 ? "person" : "people"}`}
              tone={flagged.length ? "warning" : "default"}
              sub={`${flagAt} or more quiet hours this month · ${t.quietHours} quiet hours in all`}
            />
          </KpiGrid>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ReportSection
              title="Attendance mix"
              subtitle="Every working day of everyone in the report."
            >
              <AttendanceMix totals={t} />
            </ReportSection>
            <ReportSection
              title="Needs a look"
              subtitle={`${flagAt} or more quiet hours in the month. Activity never changes focus time.`}
              aside={<ManagersOnly />}
            >
              {!activityAllowed ? (
                <ActivityGate>{null}</ActivityGate>
              ) : flagged.length === 0 ? (
                <p className="text-sm text-slate-500">Nobody this month.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {sortRows(flagged, "quiet", -1).map((r) => (
                    <li
                      key={r.person.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <Link
                        href={withReturnTo(
                          `/dashboard/reports/person/${encodeURIComponent(r.person.id)}?month=${month}`,
                          `/dashboard/reports/team?month=${month}`,
                          `${formatMonth(month)} team report`,
                        )}
                        className="min-w-0 break-words font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                      >
                        {r.person.name}
                      </Link>
                      <Chip tone="warning">
                        {r.totals.quietHours} quiet {r.totals.quietHours === 1 ? "hour" : "hours"}
                      </Chip>
                    </li>
                  ))}
                </ul>
              )}
            </ReportSection>
          </div>

          <ReportSection
            title={
              narrowed
                ? (department?.name ?? "People")
                : report.scope === "ALL"
                  ? "Everyone"
                  : "My departments"
            }
            subtitle="Ranked by focus time against the target so far. Open a name for the day-by-day report. Paid time (focus time plus paid breaks) is what payroll uses."
            flush
          >
            <RankingTable
              rows={report.rows}
              month={month}
              flagAt={flagAt}
              activity={activityAllowed}
            />
          </ReportSection>

          <ReportSection title="How the numbers work">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
              <BreakRulesItems
                bufferMin={s?.breakBufferMin}
                fullDayPct={s?.fullDayPct}
                halfDayPct={s?.halfDayPct}
              />
              <li>
                A late start is Start Day more than {s?.lateStartGraceMin ?? 10} min after the shift
                starts. It is reported only.
              </li>
              <li>
                A quiet hour is an hour under {s?.quietHourActiveMin ?? 20} active minutes with no
                meeting or break logged. {flagAt} or more in a month earns a look.
              </li>
            </ul>
          </ReportSection>
        </>
      )}
    </div>,
  );
}
