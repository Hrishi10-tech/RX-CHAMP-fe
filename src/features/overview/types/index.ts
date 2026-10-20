/** SPEC 5.4 `GET /overview` (Admin, Super Admin with an organisation, Manager). */
export interface OverviewToday {
  people: number;
  started: number;
  working: number;
  onBreak: number;
  inMeeting: number;
  away: number;
  notStarted: number;
  lateStarts: number;
  ended: number;
  focusSec: number;
  targetSec: number;
  /** Offline time today with no activity data from the app (not in focus); 0 when none. */
  unverifiedSec: number;
  /** Payroll time today (focus plus paid breaks), or null when the server leaves it out. */
  paidSec: number | null;
}

export interface OverviewApprovals {
  pending: number;
  overdue: number;
  /** The earliest due time of any pending item (overdue when it has passed), or null. */
  oldestDueAt: string | null;
}

export interface OverviewMonth {
  month: string;
  workingDays: number;
  elapsedWorkingDays: number;
  focusSec: number;
  targetSec: number;
  /** Offline time this month with no activity data from the app (not in focus). */
  unverifiedSec: number;
  /** Payroll time this month, or null when the server leaves it out. */
  paidSec: number | null;
  full: number;
  half: number;
  absent: number;
}

export interface OverviewDepartment {
  id: string;
  name: string;
  icon: string;
  staff: number;
  working: number;
  focusSec: number;
  targetSec: number;
}

export type AttentionKind =
  | "NO_DEPARTMENT"
  | "NO_AGENT"
  | "LATE_START"
  | "AWAY_UNEXPLAINED"
  | "NO_ADMIN";

export interface OverviewAttention {
  kind: AttentionKind | string;
  count: number;
  people: { id: string; name: string }[];
}

export interface OverviewView {
  scope: {
    organisation: { id: string; name: string } | null;
    departments: { id: string; name: string }[];
  };
  today: OverviewToday;
  approvals: OverviewApprovals;
  month: OverviewMonth;
  departments: OverviewDepartment[];
  attention: OverviewAttention[];
  nextHolidays: { date: string; label: string }[];
  /**
   * Working people per hour today. `null` when the server leaves it out: a
   * Manager without the activity grant.
   */
  hourly: { hour: number; working: number }[] | null;
  /** When the server built this (it caches for 15 s); null if not sent. */
  generatedAt: string | null;
}
