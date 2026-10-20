import {
  MONTH_SHORT,
  addMonths,
  calendarCells,
  formatMonth,
  isDateKey,
  isMonthKey,
  monthOfDate,
} from "@/lib/time/months";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import type { ReportPerson } from "@/features/reports/types";

// ---- Period ------------------------------------------------------------------------

/** "A day" from a calendar, "This month" so far, or "A month" up to the current one. */
export type PeriodMode = "day" | "thisMonth" | "month";

export interface PeriodChoice {
  mode: PeriodMode;
  /** The picked day, "YYYY-MM-DD". */
  day: string;
  /** The picked month, "YYYY-MM". */
  month: string;
  /** The month the day calendar is showing. */
  viewMonth: string;
}

export type ReportPeriod = { kind: "day"; date: string } | { kind: "month"; month: string };

/** Starts on last month: the one payroll usually needs. */
export function initialPeriod(today: string): PeriodChoice {
  const current = monthOfDate(today);
  return { mode: "month", day: today, month: addMonths(current, -1), viewMonth: current };
}

export function isFutureDay(date: string, today: string): boolean {
  return date > today;
}

export function isFutureMonth(month: string, today: string): boolean {
  return month > monthOfDate(today);
}

/** The period a choice stands for, or null while it is not a usable one. */
export function resolvePeriod(choice: PeriodChoice, today: string): ReportPeriod | null {
  if (choice.mode === "thisMonth") return { kind: "month", month: monthOfDate(today) };
  if (choice.mode === "day") {
    return isDateKey(choice.day) && !isFutureDay(choice.day, today)
      ? { kind: "day", date: choice.day }
      : null;
  }
  return isMonthKey(choice.month) && !isFutureMonth(choice.month, today)
    ? { kind: "month", month: choice.month }
    : null;
}

/** "Tue 13 Oct 2026", "1 to 13 Oct 2026, so far", "September 2026". */
export function periodLabel(period: ReportPeriod, today: string): string {
  if (period.kind === "day") {
    const year = period.date.slice(0, 4);
    return `${formatDayWithWeekday(period.date)} ${year}${period.date === today ? ", today" : ""}`;
  }
  if (period.month === monthOfDate(today)) {
    const day = Number(today.slice(8, 10));
    const mon = MONTH_SHORT[Number(today.slice(5, 7)) - 1];
    return day === 1
      ? `1 ${mon} ${today.slice(0, 4)}, so far`
      : `1 to ${day} ${mon} ${today.slice(0, 4)}, so far`;
  }
  return formatMonth(period.month);
}

export interface CalendarCell {
  /** null for the blank cells around the month. */
  date: string | null;
  label: string;
  disabled: boolean;
  today: boolean;
  selected: boolean;
  /** For screen readers: "Tue 13 Oct 2026". */
  ariaLabel: string;
}

/** The day picker's Monday-first grid for `viewMonth`; days after today are disabled. */
export function calendarDays(viewMonth: string, today: string, selected: string): CalendarCell[] {
  return calendarCells(viewMonth).map((date) =>
    date
      ? {
          date,
          label: String(Number(date.slice(8, 10))),
          disabled: isFutureDay(date, today),
          today: date === today,
          selected: date === selected,
          ariaLabel: `${formatDayWithWeekday(date)} ${date.slice(0, 4)}`,
        }
      : { date: null, label: "", disabled: true, today: false, selected: false, ariaLabel: "" },
  );
}

/** Whether the day calendar can move on to the next month (never past the current one). */
export function canShowNextMonth(viewMonth: string, today: string): boolean {
  return viewMonth < monthOfDate(today);
}

export interface MonthOption {
  month: string;
  label: string;
  disabled: boolean;
  current: boolean;
}

/** The twelve months of `year` for the month picker; months after this one are disabled. */
export function monthOptions(year: number, today: string): MonthOption[] {
  const current = monthOfDate(today);
  return MONTH_SHORT.map((short, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    return {
      month,
      label: month === current ? `${short}, so far` : short,
      disabled: month > current,
      current: month === current,
    };
  });
}

/** Steps a day or a month report back or forward, never into the future. */
export function stepPeriod(period: ReportPeriod, by: number, today: string): ReportPeriod | null {
  if (period.kind === "day") {
    const d = new Date(`${period.date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + by);
    const date = d.toISOString().slice(0, 10);
    return isFutureDay(date, today) ? null : { kind: "day", date };
  }
  const month = addMonths(period.month, by);
  return isFutureMonth(month, today) ? null : { kind: "month", month };
}

// ---- People --------------------------------------------------------------------------

/**
 * "Everyone in scope", "A department" (4.0: people are grouped by department,
 * not by a manager's team), or "Pick people".
 */
export type WhoMode = "everyone" | "department" | "pick";

export interface WhoChoice {
  mode: WhoMode;
  departmentId: string;
  picked: string[];
}

/** A department as the report pickers name it (GET /departments). */
export interface ReportDepartment {
  id: string;
  name: string;
  icon?: string | null;
}

export interface ResolvedWho {
  count: number;
  /** "Everyone, 8 people", "Engineering, 8 people", "Asha Kumar", "3 people". */
  label: string;
  /** Set when exactly one person is chosen: the report is about them. */
  single: ReportPerson | null;
  /** For a team report of picked people: who exactly. */
  userIds?: string[];
  /** For a department report: which one (the team endpoints narrow by it). */
  departmentId?: string;
  /** Everyone the report covers, for lists and team-day ids. */
  members: ReportPerson[];
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The people of one department, by the `departmentId` each `/reports/people` row carries. */
export function membersOf(people: ReportPerson[], dept: ReportDepartment): ReportPerson[] {
  return people.filter((p) => p.departmentId === dept.id);
}

/** The departments that have people in scope, with how many, for "A department". */
export function departmentsIn(
  people: ReportPerson[],
  departments: ReportDepartment[],
): (ReportDepartment & { count: number })[] {
  return departments
    .map((d) => ({ ...d, count: membersOf(people, d).length }))
    .filter((d) => d.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveWho(
  choice: WhoChoice,
  people: ReportPerson[],
  isAdmin: boolean,
  departments: ReportDepartment[] = [],
): ResolvedWho {
  if (choice.mode === "department") {
    const dept = departments.find((d) => d.id === choice.departmentId);
    const members = dept ? membersOf(people, dept) : [];
    return {
      count: members.length,
      label:
        dept && members.length
          ? `${dept.name}, ${plural(members.length, "person", "people")}`
          : "Pick a department",
      single: members.length === 1 ? members[0] : null,
      departmentId: dept?.id,
      members,
    };
  }
  if (choice.mode === "pick") {
    const ids = new Set(choice.picked);
    const members = people.filter((p) => ids.has(p.id));
    return {
      count: members.length,
      label:
        members.length === 0
          ? "Nobody picked yet"
          : members.length === 1
            ? members[0].name
            : plural(members.length, "person", "people"),
      single: members.length === 1 ? members[0] : null,
      userIds: members.map((p) => p.id),
      members,
    };
  }
  return {
    count: people.length,
    label: `${isAdmin ? "Everyone" : "Everyone in my departments"}, ${plural(people.length, "person", "people")}`,
    single: people.length === 1 ? people[0] : null,
    members: people,
  };
}

// ---- Where the report opens ------------------------------------------------------------

export type ReportKind = "person-day" | "person-month" | "team-day" | "team-month";

export const REPORT_KIND_TEXT: Record<ReportKind, string> = {
  "person-day": "A timeline of the day, every break and reason, and the day's totals.",
  "person-month":
    "Every day in detail: hours against target, paid and unpaid breaks, away time and decisions.",
  "team-day": "An overview of the day: each person's hours, breaks and approvals, side by side.",
  "team-month":
    "An overview: each person's hours against target, breaks, away time and attendance, side by side.",
};

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const s = search.toString();
  return s ? `?${s}` : "";
}

/** The report page for a choice of people and a period, or null when nobody is chosen. */
export function reportTarget(
  who: ResolvedWho,
  period: ReportPeriod,
): { kind: ReportKind; href: string } | null {
  if (who.count === 0) return null;
  if (who.single) {
    const base = `/dashboard/reports/person/${encodeURIComponent(who.single.id)}`;
    return period.kind === "day"
      ? { kind: "person-day", href: `${base}${query({ date: period.date })}` }
      : { kind: "person-month", href: `${base}${query({ month: period.month })}` };
  }
  // A department goes as itself (the team endpoints narrow by it); picked people as ids.
  const people = who.departmentId
    ? { departmentId: who.departmentId }
    : { userIds: who.userIds?.join(",") };
  return period.kind === "day"
    ? {
        kind: "team-day",
        href: `/dashboard/reports/team${query({ date: period.date, ...people })}`,
      }
    : {
        kind: "team-month",
        href: `/dashboard/reports/team${query({ month: period.month, ...people })}`,
      };
}
