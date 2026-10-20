/** SPEC 5.4 `GET /team`. */
export type TeamStatus = "WORKING" | "BREAK" | "MEETING" | "AWAY" | "NOT_STARTED" | "ENDED";

export const ACTIVE_STATUSES: TeamStatus[] = ["WORKING", "BREAK", "MEETING", "AWAY"];

export interface TeamDepartment {
  id: string;
  name: string;
  icon: string;
}

export interface TeamPerson {
  id: string;
  name: string;
  role: string;
  designation: string | null;
  department: TeamDepartment | null;
  status: TeamStatus;
  /** When the current status began. */
  since: string | null;
  startedAt: string | null;
  focusSec: number;
  targetSec: number;
  /** Payroll time today: focus plus paid breaks (worked out when not sent). */
  paidSec: number;
  /** Offline time today with no activity data from the app (not in focus); 0 when none. */
  unverifiedSec: number;
  online: boolean;
  agentVersion: string | null;
  /** Minutes after the shift start the day began; 0 when on time or not started. */
  lateStartMin: number;
}

export interface TeamCounts {
  all: number;
  active: number;
  working: number;
  onBreak: number;
  inMeeting: number;
  away: number;
  notStarted: number;
  ended: number;
}

export interface TeamView {
  /** The business day the statuses are for (YYYY-MM-DD), when the server says. */
  date: string | null;
  counts: TeamCounts;
  people: TeamPerson[];
}

export type TeamFilterView = "active" | "all";

export interface TeamFilters {
  view: TeamFilterView;
  /** "" for every department. */
  departmentId: string;
  q: string;
}
