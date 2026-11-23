import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import {
  CALENDAR_SOURCE_LABEL,
  DEFAULT_WEEK_PATTERN,
  SATURDAY_RULE_LABEL,
  isCalendarSource,
  isSaturdayRule,
  saturdaysBody,
  workWeekBody,
} from "@/features/calendar/lib/calendar";
import type {
  CalendarOverride,
  CalendarView,
  PersonYearView,
  SaturdayRule,
  WeekPatternPeriod,
  WorkWeekInput,
  WorkWeekView,
} from "@/features/calendar/types";

/**
 * SPEC 5.5 (and 3.5's department and person weeks, backend c10f91e):
 *   GET    /calendar?year=                       everyone signed in to the organisation
 *   PUT    /calendar/week-pattern {days: [1..7], from?: "YYYY-MM-DD"}  Admin, Super Admin
 *          (`from`, default today: the day the new week applies from; a server
 *          that does not know it yet applies the week to every day)
 *   PUT    /calendar/days/:date {isWorking, label?, departmentIds?}  (empty: everyone)
 *   DELETE /calendar/days/:date                  back to the week pattern
 *   PUT    /calendar/saturdays {saturdays, saturdayAnchor?}  the organisation's Saturday rule
 *   PUT    /calendar/departments|people {ids, workDays, saturdays, saturdayAnchor?}
 *   DELETE /calendar/departments|people {ids}    back to the department's or organisation's week
 *   GET    /calendar/people/:userId/year?year=   what decides each day (anyone who sees them)
 * Every change is Admin or Super Admin.
 */
const BASE = "/api/v1/calendar";

/** Which weeks of their own `PUT/DELETE /calendar/:scope` changes. */
export type WeekScope = "departments" | "people";

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0))]
    : [];
}

function readOverride(raw: unknown): CalendarOverride | null {
  const r = rec(raw);
  if (typeof r.date !== "string") return null;
  return {
    date: r.date,
    isWorking: r.isWorking === true,
    label: typeof r.label === "string" && r.label.trim() ? r.label : null,
    departmentIds: readIds(r.departmentIds),
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

function readRule(value: unknown): SaturdayRule {
  return isSaturdayRule(value) ? value : "EVERY";
}

function ruleLabel(value: unknown, rule: SaturdayRule): string {
  return typeof value === "string" && value ? value : SATURDAY_RULE_LABEL[rule];
}

/** A department's or a person's own week (`departments[]`, `people[]`). */
function readWeek(raw: unknown): WorkWeekView | null {
  const r = rec(raw);
  if (typeof r.id !== "string") return null;
  const saturdays = readRule(r.saturdays);
  return {
    id: r.id,
    workDays: readDays(r.workDays) ?? [],
    saturdays,
    saturdayAnchor: typeof r.saturdayAnchor === "string" ? r.saturdayAnchor : null,
    saturdaysLabel: ruleLabel(r.saturdaysLabel, saturdays),
  };
}

function readWeeks(value: unknown): WorkWeekView[] {
  return (Array.isArray(value) ? value : [])
    .map(readWeek)
    .filter((w): w is WorkWeekView => w !== null);
}

export function readCalendar(raw: unknown): CalendarView {
  const r = rec(raw);
  const pattern = readDays(r.weekPattern) ?? DEFAULT_WEEK_PATTERN;
  const saturdays = readRule(r.saturdays);
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
    saturdays,
    saturdayAnchor: typeof r.saturdayAnchor === "string" ? r.saturdayAnchor : null,
    saturdaysLabel: ruleLabel(r.saturdaysLabel, saturdays),
    departments: readWeeks(r.departments),
    people: readWeeks(r.people),
  };
}

export function readPersonYear(raw: unknown, userId: string, year: number): PersonYearView {
  const r = rec(raw);
  const source = isCalendarSource(r.source) ? r.source : "ORGANISATION";
  const days = (Array.isArray(r.days) ? r.days : [])
    .map(rec)
    .filter((d) => typeof d.date === "string")
    .map((d) => ({
      date: d.date as string,
      working: d.working === true,
      label: typeof d.label === "string" && d.label.trim() ? d.label : null,
      source: isCalendarSource(d.source) ? d.source : source,
    }));
  return {
    userId: typeof r.userId === "string" ? r.userId : userId,
    year: typeof r.year === "number" ? r.year : year,
    source,
    sourceLabel:
      typeof r.sourceLabel === "string" && r.sourceLabel
        ? r.sourceLabel
        : CALENDAR_SOURCE_LABEL[source],
    workingDays:
      typeof r.workingDays === "number" ? r.workingDays : days.filter((d) => d.working).length,
    days,
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

/** What `PUT /calendar/days/:date` takes; no departments: the day is for everyone. */
export function calendarDayBody(
  isWorking: boolean,
  label: string | null,
  departmentIds: string[] = [],
): { isWorking: boolean; label?: string; departmentIds: string[] } {
  const body: { isWorking: boolean; label?: string; departmentIds: string[] } = {
    isWorking,
    departmentIds: [...new Set(departmentIds)],
  };
  if (label) body.label = label;
  return body;
}

export async function setCalendarDay(
  date: string,
  isWorking: boolean,
  label: string | null,
  departmentIds: string[] = [],
): Promise<void> {
  const { data } = await apiClient.put<ApiResponse<unknown>>(
    `${BASE}/days/${encodeURIComponent(date)}`,
    calendarDayBody(isWorking, label, departmentIds),
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't save the day");
}

export async function clearCalendarDay(date: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(
    `${BASE}/days/${encodeURIComponent(date)}`,
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't reset the day");
}

/** 3.5: the organisation's Saturday rule (ALTERNATE needs a Saturday that is worked). */
export async function setSaturdays(rule: SaturdayRule, anchor?: string | null): Promise<void> {
  const { data } = await apiClient.put<ApiResponse<unknown>>(
    `${BASE}/saturdays`,
    saturdaysBody(rule, anchor),
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't save the Saturdays");
}

/** 3.5: one week of their own for departments or people. */
export async function setWorkWeek(
  scope: WeekScope,
  ids: string[],
  input: WorkWeekInput,
): Promise<void> {
  const { data } = await apiClient.put<ApiResponse<unknown>>(
    `${BASE}/${scope}`,
    workWeekBody(ids, input),
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't save the working week");
}

/** 3.5: back to the department's week, or the organisation's. */
export async function clearWorkWeek(scope: WeekScope, ids: string[]): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(`${BASE}/${scope}`, {
    data: { ids: [...new Set(ids)] },
  });
  if (!data?.success) throw new Error(data?.message ?? "Couldn't remove the working week");
}

/** 3.5: one person's year, day by day, with what decides each day. */
export async function getPersonYear(userId: string, year: number): Promise<PersonYearView> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(
    `${BASE}/people/${encodeURIComponent(userId)}/year`,
    { params: { year } },
  );
  return readPersonYear(unwrap(data, "Couldn't load the calendar"), userId, year);
}
