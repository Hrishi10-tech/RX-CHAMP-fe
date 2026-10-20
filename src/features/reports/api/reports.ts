import { apiClient, type ApiResponse } from "@/lib/api";
import { downloadFile } from "@/lib/api/download";
import { readItems, unwrap } from "@/lib/api/list";
import { paidSecOf } from "@/lib/format/payroll";
import { buildTeamDayQuery, buildTeamMonthQuery, fileSlug } from "@/features/reports/lib/query";
import type {
  MonthLockView,
  MonthTotals,
  PersonDaySummary,
  PersonDayReport,
  PersonMonthReport,
  ReportPerson,
  ReportRun,
  TeamDayParams,
  TeamDayReport,
  TeamMonthParams,
  TeamMonthReport,
} from "@/features/reports/types";

/**
 * SPEC 3.7 and 4.0 5.8, every request in one module (Admin, Super Admin with an
 * organisation, Manager; the scope is the server's: the organisation, or a
 * manager's departments):
 *
 *   GET    /reports/people
 *   GET    /reports/person/:userId/day?date=
 *   GET    /reports/person/:userId/month?month=
 *   GET    /reports/person/:userId/month/export.xlsx?month=
 *   GET    /reports/team/day?date=&departmentId=&userIds=a,b
 *   GET    /reports/team/month?month=&departmentId=&userIds=a,b
 *   GET    /reports/team/month/export.xlsx?month=&departmentId=&userIds=
 *   GET    /reports/runs
 *   GET    /reports/months/:month/lock
 *   POST   /reports/months/:month/lock      (Admin; 409 PENDING_APPROVALS)
 *   DELETE /reports/months/:month/lock      (Admin)
 *
 * A department report sends `departmentId` (the team endpoints narrow by it;
 * a department outside the caller's scope is a 404); picked people go as `userIds`.
 *
 * Lists the server leaves out come back as empty arrays, so a view never has
 * to guard every `.map`.
 */

const BASE = "/api/v1/reports";

function list<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

const EMPTY_TOTALS: MonthTotals = {
  workdays: 0,
  full: 0,
  half: 0,
  absent: 0,
  off: 0,
  extra: 0,
  focusSec: 0,
  expectedSec: 0,
  avgFocusSec: 0,
  lateStarts: 0,
  skipped: 0,
  autoSkipped: 0,
  overruns: 0,
  meetings: 0,
  approvedPlusSec: 0,
  rejectedMinusSec: 0,
  pending: 0,
  quietHours: 0,
  needsALook: false,
  targetSec: 0,
  breakSec: 0,
  meetingSec: 0,
  paidBreakSec: 0,
  unpaidBreakSec: 0,
  awayApprovedSec: 0,
  awayPendingSec: 0,
  unverifiedSec: 0,
  paidSec: 0,
};

function totalsOf(value: Partial<MonthTotals> | null | undefined): MonthTotals {
  // A figure the server redacts for a viewer without the grant comes as null:
  // it reads as zero (and the views hide activity for that viewer).
  const sent = Object.fromEntries(
    Object.entries(value ?? {}).filter(([, v]) => v !== null && v !== undefined),
  ) as Partial<MonthTotals>;
  const t = { ...EMPTY_TOTALS, ...sent };
  // A 3.x server sends no target: the expected hours are the nearest thing.
  if (!value || typeof value.targetSec !== "number") t.targetSec = t.expectedSec;
  // A month locked before paid time existed: focus plus paid breaks, as the server works it out.
  t.paidSec = paidSecOf({ ...t, paidSec: value?.paidSec });
  return t;
}

/** The 4.0 fields of a day, zero when an older server leaves them out. */
export function daySummaryOf(d: PersonDaySummary): PersonDaySummary {
  const num = (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback);
  return {
    ...d,
    targetSec: num(d.targetSec, num(d.expectedSec)),
    paidBreakSec: num(d.paidBreakSec),
    unpaidBreakSec: num(d.unpaidBreakSec),
    awayApprovedSec: num(d.awayApprovedSec),
    awayPendingSec: num(d.awayPendingSec),
    awayRejectedSec: num(d.awayRejectedSec),
    awayUnexplainedSec: num(d.awayUnexplainedSec),
    unverifiedSec: num(d.unverifiedSec),
    paidSec: paidSecOf(d),
    label: typeof d.label === "string" && d.label ? d.label : null,
    // Activity figures a manager without the grant gets as null.
    activeMin: num(d.activeMin),
    quietHours: num(d.quietHours),
  };
}

export async function getReportPeople(): Promise<ReportPerson[]> {
  const { data } = await apiClient.get<ApiResponse<{ items: ReportPerson[] }>>(`${BASE}/people`);
  return readItems<ReportPerson>(unwrap(data, "Failed to load people"));
}

export async function getPersonDayReport(userId: string, date: string): Promise<PersonDayReport> {
  const { data } = await apiClient.get<ApiResponse<PersonDayReport>>(
    `${BASE}/person/${encodeURIComponent(userId)}/day`,
    { params: { date } },
  );
  const r = unwrap(data, "Failed to load the day report");
  if (!r.person || !r.summary) throw new Error("The day report came back incomplete.");
  return {
    ...r,
    summary: daySummaryOf(r.summary),
    timeline: list(r.timeline),
    skips: list(r.skips),
    breaks: list(r.breaks),
    meetings: list(r.meetings),
    approvals: list(r.approvals),
    hourly: list(r.hourly),
  };
}

export async function getPersonMonthReport(
  userId: string,
  month: string,
): Promise<PersonMonthReport> {
  const { data } = await apiClient.get<ApiResponse<PersonMonthReport>>(
    `${BASE}/person/${encodeURIComponent(userId)}/month`,
    { params: { month } },
  );
  const r = unwrap(data, "Failed to load the month report");
  if (!r.person) throw new Error("The month report came back incomplete.");
  return {
    ...r,
    totals: totalsOf(r.totals),
    days: list(r.days).map(daySummaryOf),
    heatmap: list(r.heatmap).map((d) => ({ ...d, hours: list(d.hours) })),
  };
}

export async function getTeamDayReport(params: TeamDayParams): Promise<TeamDayReport> {
  const { data } = await apiClient.get<ApiResponse<TeamDayReport>>(`${BASE}/team/day`, {
    params: buildTeamDayQuery(params),
  });
  const r = unwrap(data, "Failed to load the team day report");
  return {
    ...r,
    rows: list(r.rows)
      .filter((row) => row?.person?.id && row.summary)
      .map((row) => ({ ...row, summary: daySummaryOf(row.summary) })),
  };
}

export async function getTeamMonthReport(params: TeamMonthParams): Promise<TeamMonthReport> {
  const { data } = await apiClient.get<ApiResponse<TeamMonthReport>>(`${BASE}/team/month`, {
    params: buildTeamMonthQuery(params),
  });
  const r = unwrap(data, "Failed to load the team month report");
  const rows = list(r.rows).filter((row) => row?.person?.id);
  return {
    ...r,
    totals: { ...totalsOf(r.totals), people: r.totals?.people ?? rows.length },
    rows: rows.map((row) => ({
      ...row,
      totals: totalsOf(row.totals),
      days: list(row.days),
    })),
  };
}

/** Excel for payroll, team or everyone. Saves the file; resolves with its name. */
export function downloadTeamMonthXlsx(params: TeamMonthParams): Promise<string> {
  return downloadFile(
    `${BASE}/team/month/export.xlsx`,
    buildTeamMonthQuery(params),
    `rx-vision-${params.month}-team.xlsx`,
  );
}

/** Excel for payroll, one person. Saves the file; resolves with its name. */
export function downloadPersonMonthXlsx(
  userId: string,
  month: string,
  personName?: string,
): Promise<string> {
  return downloadFile(
    `${BASE}/person/${encodeURIComponent(userId)}/month/export.xlsx`,
    { month },
    `rx-vision-${month}-${fileSlug(personName ?? userId)}.xlsx`,
  );
}

/** The monthly reports built for the caller (00:30 on the 1st). */
export async function getReportRuns(): Promise<ReportRun[]> {
  const { data } = await apiClient.get<ApiResponse<{ items: ReportRun[] }>>(`${BASE}/runs`);
  return readItems<ReportRun>(unwrap(data, "Failed to load monthly reports")).map((run) => ({
    ...run,
    summary: run.summary && typeof run.summary === "object" ? run.summary : {},
  }));
}

function lockUrl(month: string): string {
  return `${BASE}/months/${encodeURIComponent(month)}/lock`;
}

export async function getMonthLock(month: string): Promise<MonthLockView> {
  const { data } = await apiClient.get<ApiResponse<MonthLockView>>(lockUrl(month));
  return unwrap(data, "Failed to load the month's lock");
}

/** Super Admin. Refused with 409 PENDING_APPROVALS (`details.count`) while anything is pending. */
export async function lockMonth(month: string): Promise<MonthLockView> {
  const { data } = await apiClient.post<ApiResponse<MonthLockView>>(lockUrl(month), {});
  return unwrap(data, "Failed to lock the month");
}

/** Super Admin. */
export async function unlockMonth(month: string): Promise<MonthLockView> {
  const { data } = await apiClient.delete<ApiResponse<MonthLockView>>(lockUrl(month));
  return unwrap(data, "Failed to unlock the month");
}
