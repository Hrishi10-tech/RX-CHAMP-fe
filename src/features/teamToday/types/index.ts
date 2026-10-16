/** Mirrors SPEC 3.1 section 3.5 (Team today). */
import type { HourActivity } from "@/features/activity/types/hourly";
import type { BreakRecordView } from "@/features/breaks/types";
import type { BreakKind } from "@/features/shifts/types";
import type { FocusView } from "@/features/workday/types";

export type TeamTodayStatus =
  | "NOT_STARTED"
  | "WORKING"
  | "BREAK"
  | "LUNCH"
  | "MEETING"
  | "DAY_ENDED";

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
  lateStart: { minutes: number } | null;
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
}
