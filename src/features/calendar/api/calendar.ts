import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import { DEFAULT_WEEK_PATTERN } from "@/features/calendar/lib/calendar";
import type { CalendarOverride, CalendarView, WeekPatternPeriod } from "@/features/calendar/types";

/**
 * SPEC 5.5:
 *   GET    /calendar?year=                       everyone signed in to the organisation
 *   PUT    /calendar/week-pattern {days: [1..7], from?: "YYYY-MM-DD"}  Admin, Super Admin
 *          (`from`, default today: the day the new week applies from; a server
 *          that does not know it yet applies the week to every day)
 *   PUT    /calendar/days/:date {isWorking, label?}
 *   DELETE /calendar/days/:date                  back to the week pattern
 */
const BASE = "/api/v1/calendar";

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readOverride(raw: unknown): CalendarOverride | null {
  const r = rec(raw);
  if (typeof r.date !== "string") return null;
  return {
    date: r.date,
    isWorking: r.isWorking === true,
    label: typeof r.label === "string" && r.label.trim() ? r.label : null,
  };
}

function readDays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = value.filter((d): d is number => typeof d === "number" && d >= 1 && d <= 7);
  return [...new Set(days)].sort((a, b) => a - b);
}

/** The pattern history, whichever name the server gives it; oldest first. */
function readHistory(r: Record<string, unknown>): WeekPatternPeriod[] {
  const list = [r.weekPatternHistory, r.patternHistory, r.weekPatterns, r.history].find(
    Array.isArray,
  );
  if (!Array.isArray(list)) return [];
  return list
    .map(rec)
    .map((p) => {
      const from =
        typeof p.from === "string"
          ? p.from
          : typeof p.effectiveFrom === "string"
            ? p.effectiveFrom
            : "";
      const days = readDays(p.days ?? p.weekPattern);
      return from && days?.length ? { from: from.slice(0, 10), days } : null;
    })
    .filter((p): p is WeekPatternPeriod => p !== null)
    .sort((a, b) => a.from.localeCompare(b.from));
}

export function readCalendar(raw: unknown): CalendarView {
  const r = rec(raw);
  const pattern = readDays(r.weekPattern) ?? DEFAULT_WEEK_PATTERN;
  return {
    weekPattern: pattern,
    patternHistory: readHistory(r),
    overrides: (Array.isArray(r.overrides) ? r.overrides : [])
      .map(readOverride)
      .filter((o): o is CalendarOverride => o !== null),
    months: (Array.isArray(r.months) ? r.months : []).map((m) => {
      const x = rec(m);
      // "YYYY-MM", or a month number alongside the response's `year`.
      const month =
        typeof x.month === "string"
          ? x.month
          : typeof x.month === "number" && typeof r.year === "number"
            ? `${r.year}-${String(x.month).padStart(2, "0")}`
            : "";
      return {
        month,
        workingDays: typeof x.workingDays === "number" ? x.workingDays : 0,
        holidays: (Array.isArray(x.holidays) ? x.holidays : [])
          .map(rec)
          .filter((h) => typeof h.date === "string")
          .map((h) => ({
            date: h.date as string,
            label: typeof h.label === "string" ? h.label : "",
          })),
      };
    }),
  };
}

export async function getCalendar(year: number): Promise<CalendarView> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(BASE, { params: { year } });
  return readCalendar(unwrap(data, "Couldn't load the calendar"));
}

export async function setWeekPattern(days: number[], from?: string): Promise<void> {
  const body: { days: number[]; from?: string } = { days };
  if (from) body.from = from;
  const { data } = await apiClient.put<ApiResponse<unknown>>(`${BASE}/week-pattern`, body);
  if (!data?.success) throw new Error(data?.message ?? "Couldn't save the working week");
}

export async function setCalendarDay(
  date: string,
  isWorking: boolean,
  label: string | null,
): Promise<void> {
  const body: { isWorking: boolean; label?: string } = { isWorking };
  if (label) body.label = label;
  const { data } = await apiClient.put<ApiResponse<unknown>>(
    `${BASE}/days/${encodeURIComponent(date)}`,
    body,
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't save the day");
}

export async function clearCalendarDay(date: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(
    `${BASE}/days/${encodeURIComponent(date)}`,
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't reset the day");
}
