/** SPEC 2.6 / 5.5: the organisation's working days. */
export interface CalendarOverride {
  /** "YYYY-MM-DD". */
  date: string;
  isWorking: boolean;
  /** A holiday's name ("Diwali"), or why a day became a working one. */
  label: string | null;
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
}

export interface CalendarMonthGrid {
  month: string;
  /** Monday-first weeks; null pads the days outside the month. */
  weeks: (CalendarDayCell | null)[][];
  workingDays: number;
}
