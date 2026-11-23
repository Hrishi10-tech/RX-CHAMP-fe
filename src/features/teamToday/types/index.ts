/** Mirrors SPEC 3.1 section 3.5 (Team today). */
import type { HourActivity } from "@/features/activity/types/hourly";
import type { BreakRecordView } from "@/features/breaks/types";
import type { BreakKind } from "@/features/shifts/types";
import type { FocusView } from "@/features/workday/types";
import type { DayLeaveView } from "@/features/leave/types";

export type TeamTodayStatus =
  | "NOT_STARTED"
  | "WORKING"
  | "BREAK"
  | "LUNCH"
  | "MEETING"
  | "DAY_ENDED"
  /** 3.4: a full day of approved leave, not started. */
  | "ON_LEAVE";

export type TeamTodayBreakStatus =
  | "UPCOMING"
  | "OPEN"
  | "IN_PROGRESS"
  | "TAKEN"
  | "SKIPPED"
  | "AUTO_SKIPPED"
  | "MISSED";

export interface TeamTodayPerson {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  managerId: string | null;
  /** 3.3: the person's organisation (a chip on combined lists). */
  companyId?: string | null;
  companyName?: string | null;
}

export interface TeamTodayBreakCell {
  kind: BreakKind;
  label: string;
  status: TeamTodayBreakStatus;
  record: BreakRecordView | null;
}

export interface TeamTodayRow {
  /**
   * The business day this row covers ("YYYY-MM-DD"). A night shift's day is the
   * one it started on, so a row can differ from the page's date just after
   * midnight. Optional: a 3.1.0 server leaves it out.
   */
  date?: string;
  user: TeamTodayPerson;
  status: TeamTodayStatus;
  statusSince: string | null;
  startedAt: string | null;
  endedAt: string | null;
  autoClosed: boolean;
  /**
   * Minutes late after the grace, and why (3.2). A 3.1.0 server sends only the
   * minutes.
   */
  lateStart: {
    minutes: number;
    graceMin?: number;
    reason?: string | null;
    reasonAt?: string | null;
    needsReason?: boolean;
  } | null;
  /** 3.2: a holiday (with its name) or a weekly day off by the calendar; null on a working day. */
  dayOff?: { kind: "HOLIDAY" | "WEEKLY_OFF"; name: string | null } | null;
  /** 3.4: leave that day (approved, and any still waiting). */
  leave?: DayLeaveView | null;
  focus: FocusView;
  expectedSec: number;
  breaks: TeamTodayBreakCell[];
  meetings: { count: number; sec: number };
  pending: number;
  /** 24 entries, hour 0..23. */
  hourly: HourActivity[];
  quietHours: number;
}

export interface TeamTodayTotals {
  people: number;
  started: number;
  notStarted: number;
  onBreak: number;
  inMeeting: number;
  ended: number;
  /** 3.4: on a full day of leave, and with part of the day on leave. */
  onLeave?: number;
  partLeave?: number;
  lateStarts: number;
  /** Pending items dated on each row's day, for these people (the sum of the rows' `pending`). */
  pendingApprovals: number;
  /** Overdue items of any date, for these people. */
  overdueApprovals: number;
  focusSec: number;
  quietHours: number;
}

export interface TeamTodayView {
  date: string;
  serverNow: string;
  totals: TeamTodayTotals;
  rows: TeamTodayRow[];
}

export interface GetTeamTodayParams {
  /** "YYYY-MM-DD"; omitted = today. */
  date?: string;
  /** Super Admin: one manager's team; omitted = everyone. */
  managerId?: string;
  /** 3.3: on "All organisations", only this organisation. */
  companyId?: string;
}
