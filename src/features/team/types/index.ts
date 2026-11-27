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
  /** 3.6: the effective avatar; null while they have no gender. */
  avatarId?: string | null;
  role: string;
  designation: string | null;
  department: TeamDepartment | null;
  status: TeamStatus;
  /** When the current status began. */
  since: string | null;
  /** 4.1: on a remote day right now (started from the portal or the phone): WORKING reads "Remote". */
  remote?: boolean;
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
  /** 3.2: why the day started late, once given (absent from an older API). */
  lateReason?: string | null;
  /** 3.4: leave that day, or null (absent from an older API). */
  leave?: { label: string; categories: string; full: boolean; pendingDays: number } | null;
  /** 3.5: how the day is recorded (absent from an older API: the agent). */
  attendance?: "AGENT" | "BIOMETRIC";
  /** 3.5: work from home approved that day, in days (0.5 for half a day). */
  wfhDays?: number;
  /** 3.5: a biometric day closed at the last punch with no check-out. */
  noCheckout?: boolean;
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
  /** This page of people (the server pages the list). */
  people: TeamPerson[];
  /** The server's paging, or null when it sent everyone in one answer. */
  meta: { page: number; limit: number; total: number; totalPages: number } | null;
}

/** What the Team page asks GET /team for. */
export interface TeamQuery {
  view: TeamFilterView;
  departmentId?: string;
  q?: string;
  page: number;
  limit: number;
}

export type TeamFilterView = "active" | "all";

export interface TeamFilters {
  view: TeamFilterView;
  /** "" for every department. */
  departmentId: string;
  q: string;
}
