import { apiClient, type ApiResponse } from "@/lib/api";
import { downloadFile } from "@/lib/api/download";
import { unwrap } from "@/lib/api/list";
import { paidSecOf } from "@/lib/format/payroll";
import { formatTime12 } from "@/lib/time/format";
import { isoWeekday } from "@/lib/time/months";
import type {
  Timesheet,
  TimesheetPerson,
  TimesheetRow,
  TimesheetTime,
  TimesheetTotals,
} from "@/features/timesheet/types";

/**
 * SPEC 5.8, one request for the whole range (at most 366 days):
 *   GET /reports/person/:id/timesheet?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   GET /reports/person/:id/timesheet.xlsx?from&to
 */
export const MAX_TIMESHEET_DAYS = 366;

/** Long enough for a year on a slow line, short enough that a hang always ends. */
export const TIMESHEET_TIMEOUT_MS = 30_000;

function base(userId: string): string {
  return `/api/v1/reports/person/${encodeURIComponent(userId)}/timesheet`;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * `in` / `out` arrive as an ISO string with the 12-hour text beside it
 * (`in12` / `out12`, "9:05 AM"). An object such as `{ at | iso, text }` or an
 * `inText` is read too. Whatever came, the result has the instant and a
 * 12-hour text.
 */
export function readTime(value: unknown, text?: unknown): TimesheetTime | null {
  let iso: string | null = null;
  let label: string | null = str(text);
  if (typeof value === "string") iso = value;
  else if (value && typeof value === "object") {
    const r = rec(value);
    iso = str(r.iso) ?? str(r.at) ?? str(r.value);
    label = label ?? str(r.text) ?? str(r.label) ?? str(r.display);
  }
  if (!iso && !label) return null;
  // Our own formatter wins for an instant, so the PDF and the screen agree.
  const formatted = iso ? formatTime12(iso) : "";
  return { iso, text: formatted || label || "" };
}

export function readRow(raw: unknown): TimesheetRow | null {
  const r = rec(raw);
  const date = str(r.date);
  if (!date) return null;
  return {
    date,
    weekday:
      typeof r.weekday === "number" && r.weekday >= 1 && r.weekday <= 7
        ? r.weekday
        : isoWeekday(date),
    isWorkingDay: r.isWorkingDay !== false,
    label: str(r.label),
    in: readTime(r.in, r.in12 ?? r.inText),
    out: readTime(r.out, r.out12 ?? r.outText),
    focusSec: num(r.focusSec),
    targetSec: num(r.targetSec),
    breakSec: num(r.breakSec),
    paidBreakSec: num(r.paidBreakSec),
    unpaidBreakSec: num(r.unpaidBreakSec),
    meetingsSec: num(r.meetingsSec),
    awayApprovedSec: num(r.awayApprovedSec),
    awayPendingSec: num(r.awayPendingSec),
    unverifiedSec: num(r.unverifiedSec),
    paidSec: num(paidSecOf(r)),
    status: (str(r.status) ?? "").toUpperCase(),
  };
}

/** Totals from the rows, for a server that leaves some out. */
export function totalsOf(rows: TimesheetRow[]): TimesheetTotals {
  const t: TimesheetTotals = {
    days: rows.length,
    focusSec: 0,
    targetSec: 0,
    breakSec: 0,
    paidBreakSec: 0,
    unpaidBreakSec: 0,
    meetingsSec: 0,
    awayApprovedSec: 0,
    awayPendingSec: 0,
    unverifiedSec: 0,
    paidSec: 0,
    workingDays: 0,
    full: 0,
    half: 0,
    absent: 0,
  };
  for (const r of rows) {
    t.focusSec += r.focusSec;
    t.targetSec += r.targetSec;
    t.breakSec += r.breakSec;
    t.paidBreakSec += r.paidBreakSec;
    t.unpaidBreakSec += r.unpaidBreakSec;
    t.meetingsSec += r.meetingsSec;
    t.awayApprovedSec += r.awayApprovedSec;
    t.awayPendingSec += r.awayPendingSec;
    t.unverifiedSec += r.unverifiedSec;
    t.paidSec += r.paidSec;
    if (r.isWorkingDay) t.workingDays += 1;
    if (r.status === "FULL") t.full += 1;
    else if (r.status === "HALF") t.half += 1;
    else if (r.status === "ABSENT") t.absent += 1;
  }
  return t;
}

function readPerson(raw: unknown, userId: string, fallbackName?: string): TimesheetPerson {
  const r = rec(raw);
  const dept = r.department;
  const org = r.organisation;
  return {
    id: str(r.id) ?? userId,
    name: str(r.name) ?? fallbackName ?? "",
    email: str(r.email),
    designation: str(r.designation),
    department: typeof dept === "string" ? dept : str(rec(dept).name),
    organisation: typeof org === "string" ? org : str(rec(org).name),
  };
}

export function readTimesheet(
  raw: unknown,
  userId: string,
  asked: { from: string; to: string },
  fallbackName?: string,
): Timesheet {
  const body = rec(raw);
  const rows = (Array.isArray(body.rows) ? body.rows : [])
    .map(readRow)
    .filter((r): r is TimesheetRow => r !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const computed = totalsOf(rows);
  const sent = rec(body.totals);
  const totals = { ...computed };
  for (const key of Object.keys(computed) as (keyof TimesheetTotals)[]) {
    if (typeof sent[key] === "number") totals[key] = num(sent[key]);
  }
  const range = rec(body.range);
  return {
    person: readPerson(body.person, userId, fallbackName),
    range: { from: str(range.from) ?? asked.from, to: str(range.to) ?? asked.to },
    rows,
    totals,
  };
}

export async function getTimesheet(
  userId: string,
  from: string,
  to: string,
  options: { signal?: AbortSignal; fallbackName?: string } = {},
): Promise<Timesheet> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(base(userId), {
    params: { from, to },
    signal: options.signal,
    timeout: TIMESHEET_TIMEOUT_MS,
  });
  return readTimesheet(
    unwrap(data, "Couldn't load the timesheet"),
    userId,
    { from, to },
    options.fallbackName,
  );
}

/**
 * `rx-vision-timesheet-asha-k-2026-10-01-to-2026-10-19` (no extension), the
 * name the server gives the Excel file, so the PDF and the workbook pair up.
 */
export function timesheetFileBase(name: string | undefined, from: string, to: string): string {
  const who = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `rx-vision-timesheet-${who || "person"}-${from}-to-${to}`;
}

/** Saves the server's Excel workbook for the range; resolves with the file name. */
export function downloadTimesheetXlsx(
  userId: string,
  from: string,
  to: string,
  name?: string,
): Promise<string> {
  return downloadFile(
    `${base(userId)}.xlsx`,
    { from, to },
    `${timesheetFileBase(name, from, to)}.xlsx`,
  );
}
