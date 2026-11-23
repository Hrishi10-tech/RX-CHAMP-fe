/** SPEC 2.6 / 5.5: the organisation's working days. */
export interface CalendarOverride {
  /** "YYYY-MM-DD". */
  date: string;
  isWorking: boolean;
  /** A holiday's name ("Diwali"), or why a day became a working one. */
  label: string | null;
  /**
   * 3.5: the departments the day is for (a department holiday). Empty: the whole
   * organisation. Absent from a server that does not know it yet.
   */
  departmentIds?: string[];
}

export interface CalendarMonthSummary {
  /** "YYYY-MM". */
  month: string;
  workingDays: number;
  holidays: { date: string; label: string }[];
}

/** A working week and the day it took effect ("YYYY-MM-DD"). */
export interface WeekPatternPeriod {
  from: string;
  days: number[];
}

/** 3.5: how the Saturdays of a working week are worked. */
export type SaturdayRule = "EVERY" | "NONE" | "OFF_2_4" | "OFF_1_3" | "OFF_1_3_5" | "ALTERNATE";

/**
 * 3.5: a department's or a person's own working week, as `GET /calendar` lists
 * it. Saturday is worked only when `workDays` has 6, and then by `saturdays`.
 */
export interface WorkWeekView {
  /** The department's or the person's id. */
  id: string;
  /** ISO weekdays, 1 = Monday. */
  workDays: number[];
  saturdays: SaturdayRule;
  /** ALTERNATE: a Saturday that is worked. */
  saturdayAnchor: string | null;
  saturdaysLabel: string;
}

/**
 * What the week form gives: the weekdays other than Saturday, and the Saturday
 * rule (Saturday is set by the rule, never by a weekday toggle, as in 3.5).
 */
export interface WorkWeekInput {
  workDays: number[];
  saturdays: SaturdayRule;
  saturdayAnchor?: string;
}

/** The body of `PUT /calendar/departments` and `PUT /calendar/people`. */
export interface WorkWeekBody {
  ids: string[];
  workDays: number[];
  saturdays: SaturdayRule;
  saturdayAnchor?: string;
}

export interface CalendarView {
  /** ISO weekdays that are working days now, 1 = Monday. */
  weekPattern: number[];
  /**
   * Earlier and current working weeks, oldest first, each from its date (a
   * pattern change applies from a day, SPEC 2.6). Empty from a server that keeps
   * only the current pattern: it then applies to every day.
   */
  patternHistory: WeekPatternPeriod[];
  overrides: CalendarOverride[];
  months: CalendarMonthSummary[];
  /** 3.5: the organisation's Saturday rule, for the Saturdays in its week pattern. */
  saturdays: SaturdayRule;
  saturdayAnchor: string | null;
  saturdaysLabel: string;
  /** 3.5: departments with a week of their own. */
  departments: WorkWeekView[];
  /** 3.5: people with a week of their own. */
  people: WorkWeekView[];
}

/** 3.5: what decides a person's day. */
export type CalendarSource = "OVERRIDE" | "PERSON" | "DEPARTMENT" | "ORGANISATION";

/** `GET /calendar/people/:userId/year`. */
export interface PersonYearView {
  userId: string;
  year: number;
  /** What decides most of their days. */
  source: CalendarSource;
  sourceLabel: string;
  workingDays: number;
  days: { date: string; working: boolean; label: string | null; source: CalendarSource }[];
}

/** One square of the year view. */
export interface CalendarDayCell {
  date: string;
  day: number;
  /** ISO weekday, 1 = Monday. */
  weekday: number;
  isWorking: boolean;
  label: string | null;
  /** True when the day differs from (or is pinned against) the week pattern. */
  overridden: boolean;
  isToday: boolean;
  /**
   * 3.5: the day is set for these departments only (empty: for everyone, or not
   * set). `isWorking` is then still the organisation's answer.
   */
  departmentIds: string[];
  /** What the day set on the calendar says (null: nothing set). */
  setWorking: boolean | null;
}

export interface CalendarMonthGrid {
  month: string;
  /** Monday-first weeks; null pads the days outside the month. */
  weeks: (CalendarDayCell | null)[][];
  workingDays: number;
}
