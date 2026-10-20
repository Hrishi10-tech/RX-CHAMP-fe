/** SPEC 5.8 `GET /reports/person/:id/timesheet?from&to`. */
export type TimesheetDayStatus =
  | "FULL"
  | "HALF"
  | "ABSENT"
  | "OFF"
  | "EXTRA"
  | "IN_PROGRESS"
  | "UPCOMING";

/** An in/out time: the instant, and the server's 12-hour text when it sent one. */
export interface TimesheetTime {
  iso: string | null;
  /** "9:05 AM". */
  text: string;
}

export interface TimesheetRow {
  date: string;
  /** ISO weekday, 1 = Monday ... 7 = Sunday. */
  weekday: number;
  isWorkingDay: boolean;
  /** A holiday or override label ("Diwali"), else null. */
  label: string | null;
  in: TimesheetTime | null;
  out: TimesheetTime | null;
  focusSec: number;
  targetSec: number;
  breakSec: number;
  paidBreakSec: number;
  unpaidBreakSec: number;
  meetingsSec: number;
  awayApprovedSec: number;
  awayPendingSec: number;
  /**
   * Time inside a work session recorded offline (replayed) with no activity data
   * from the app; it is left out of focus. 0 from servers that do not send it.
   */
  unverifiedSec: number;
  /** Payroll time: focus time plus paid breaks (worked out when not sent). */
  paidSec: number;
  status: string;
}

export interface TimesheetTotals {
  /** Days in the range. */
  days: number;
  focusSec: number;
  targetSec: number;
  breakSec: number;
  paidBreakSec: number;
  unpaidBreakSec: number;
  meetingsSec: number;
  awayApprovedSec: number;
  awayPendingSec: number;
  unverifiedSec: number;
  paidSec: number;
  workingDays: number;
  full: number;
  half: number;
  absent: number;
}

export interface TimesheetPerson {
  id: string;
  name: string;
  email: string | null;
  designation: string | null;
  department: string | null;
  organisation: string | null;
}

export interface Timesheet {
  person: TimesheetPerson;
  range: { from: string; to: string };
  rows: TimesheetRow[];
  totals: TimesheetTotals;
}
