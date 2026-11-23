/**
 * Mirrors SPEC 3.1 section 3.7 (Reports). Day keys "YYYY-MM-DD", month keys
 * "YYYY-MM", instants ISO, durations in seconds unless named ...Min.
 */
import type { HourActivity } from "@/features/activity/types/hourly";
import type { ApprovalItemView } from "@/features/approvals/types";
import type { BreakRecordView } from "@/features/breaks/types";
import type { MeetingRecordView } from "@/features/meetings/types";
import type { FocusAdjustmentView } from "@/features/adjustments/types";
import type { BreakKind, ShiftRef } from "@/features/shifts/types";
import type { DayLeaveView } from "@/features/leave/types";

export type DayClass =
  | "FULL"
  | "HALF"
  | "ABSENT"
  | "OFF"
  | "EXTRA"
  /** 3.4: a full day of approved leave, not worked. */
  | "LEAVE"
  | "IN_PROGRESS"
  | "UPCOMING";

export interface ReportPerson {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  /** 4.0: the person's department (absent from months locked before 4.0). */
  departmentId?: string | null;
  designation: string | null;
  /** 3.x reporting line; 4.0 groups people by department instead. Not shown. */
  managerId: string | null;
  managerName: string | null;
  /** 3.3: the person's organisation (a chip on combined lists). */
  companyId?: string | null;
  companyName?: string | null;
}

export interface PersonDaySummary {
  date: string;
  /** ISO weekday, 1 = Monday. */
  weekday: number;
  workday: boolean;
  dayClass: DayClass;
  startedAt: string | null;
  endedAt: string | null;
  autoClosed: boolean;
  /** 4.1 shared computer: the day was carried on into the next shift. */
  extended?: boolean;
  /** 4.1: how long the extended day ran past the shift end. */
  extendedSec?: number;
  /** Minutes after the shift start plus the grace, and why (3.2; null until given). */
  lateStart: { minutes: number; reason?: string | null } | null;
  /** 3.2: a holiday (with its name) or a weekly day off; null on a working day. */
  dayOff?: { kind: "HOLIDAY" | "WEEKLY_OFF"; name: string | null } | null;
  focusSec: number;
  expectedSec: number;
  breakSec: number;
  meetingSec: number;
  approvedPlusSec: number;
  rejectedMinusSec: number;
  pendingPlusSec: number;
  pendingMinusSec: number;
  breaksTaken: number;
  skipped: number;
  autoSkipped: number;
  overruns: number;
  meetings: number;
  pending: number;
  quietHours: number;
  activeMin: number;
  /** 4.0 (SPEC 2.4, 5.8): the day's focus target (shift minus the paid allowance). */
  targetSec: number;
  /** 4.0: break time paid by the allowance, and the rest. */
  paidBreakSec: number;
  unpaidBreakSec: number;
  /** 4.0: away time by decision (approved counts as focus; pending would if approved). */
  awayApprovedSec: number;
  awayPendingSec: number;
  awayRejectedSec: number;
  awayUnexplainedSec: number;
  /**
   * Time inside a work session recorded offline (replayed) with no activity
   * data from the agent; it is left out of focus. 0 from servers without it.
   */
  unverifiedSec: number;
  /** Payroll time: focus time plus paid breaks (worked out when not sent). */
  paidSec: number;
  /** 4.0: the calendar's name for the day (a holiday), if any. */
  label: string | null;
  /**
   * 3.3: signed seconds added to focus by hand (Super Manager), already inside
   * focusSec and paidSec. 0 when not sent.
   */
  adjustedSec?: number;
  /** 3.2 (fix 10): seconds with keyboard or mouse input inside the working day. */
  activeSec?: number;
  /** 3.2: seconds inside the working day not on a break or in a meeting. */
  availableSec?: number;
  /** 3.4: leave that day (approved, and any still waiting). */
  leave?: DayLeaveView | null;
  /** 3.4: the expected time the approved leave covers (paid leave time). */
  leaveSec?: number;
}

export type TimelineKind = "WORK" | "BREAK" | "LUNCH" | "MEETING" | "OFF";

export interface TimelineSegment {
  kind: TimelineKind;
  startedAt: string;
  endedAt: string;
  label: string;
}

export interface ReportSkip {
  at: string;
  kind: BreakKind;
  label: string;
  outcome: "SKIPPED" | "AUTO_SKIPPED";
}

export interface PersonDayReport {
  person: ReportPerson;
  summary: PersonDaySummary;
  shift: ShiftRef | null;
  timeline: TimelineSegment[];
  skips: ReportSkip[];
  breaks: BreakRecordView[];
  meetings: MeetingRecordView[];
  approvals: ApprovalItemView[];
  hourly: HourActivity[];
  /** 3.3: the day's manual focus adjustments, newest first, undone ones included. */
  adjustments?: FocusAdjustmentView[];
  /**
   * 3.2 (fix 10): keyboard and mouse input inside the available time (sessions
   * minus breaks and meetings): active, idle (nobody at the computer, or locked)
   * and no data (the agent was not reporting). Null when it could not be read.
   */
  input?: { activeSec: number; idleSec: number; noDataSec: number; availableSec: number } | null;
}

export interface MonthTotals {
  workdays: number;
  full: number;
  half: number;
  absent: number;
  off: number;
  extra: number;
  focusSec: number;
  expectedSec: number;
  avgFocusSec: number;
  lateStarts: number;
  /** 3.2: late starts still without a reason. */
  lateWithoutReason?: number;
  /** 3.2: holidays in the month. */
  holidays?: number;
  skipped: number;
  autoSkipped: number;
  overruns: number;
  meetings: number;
  approvedPlusSec: number;
  rejectedMinusSec: number;
  pending: number;
  quietHours: number;
  /** 3.2 (fix 10): keyboard and mouse input inside working days. */
  activeSec?: number;
  availableSec?: number;
  /** 3.4: full days of leave, days of leave by pool (part days included), paid leave time. */
  leave?: number;
  leaveDays?: number;
  clslDays?: number;
  elplDays?: number;
  leaveSec?: number;
  needsALook: boolean;
  /** 4.0: the month's focus target (working days from the join date), paid and unpaid breaks, away. */
  targetSec: number;
  breakSec: number;
  meetingSec: number;
  paidBreakSec: number;
  unpaidBreakSec: number;
  awayApprovedSec: number;
  awayPendingSec: number;
  /** Offline time with no activity data, left out of focus (0 when not sent). */
  unverifiedSec: number;
  /** Payroll time: focus time plus paid breaks (worked out when not sent). */
  paidSec: number;
  /** 3.3: signed seconds added to focus by hand over the month (0 when not sent). */
  adjustedSec?: number;
}

export interface HeatmapDay {
  date: string;
  /** Active minutes in each hour, 0..23. */
  hours: number[];
}

export interface PersonMonthReport {
  person: ReportPerson;
  month: string;
  locked: boolean;
  generatedAt: string;
  totals: MonthTotals;
  days: PersonDaySummary[];
  heatmap: HeatmapDay[];
}

export interface TeamMonthDay {
  date: string;
  dayClass: DayClass;
  focusSec: number;
}

export interface TeamMonthRow {
  person: ReportPerson;
  totals: MonthTotals;
  days: TeamMonthDay[];
}

export interface TeamMonthReport {
  month: string;
  scope: "TEAM" | "ALL";
  locked: boolean;
  generatedAt: string;
  totals: MonthTotals & { people: number };
  rows: TeamMonthRow[];
}

export interface TeamDayReport {
  date: string;
  rows: { person: ReportPerson; summary: PersonDaySummary }[];
}

export interface ReportRun {
  id: string;
  month: string;
  scope: string;
  generatedAt: string;
  /**
   * A small summary the server keeps with the run; its keys are not fixed (quiet
   * hours and needs-a-look are left out for a viewer without the activity grant).
   */
  summary: Record<string, unknown>;
}

/** One pending item that holds a month's payroll lock (3.2). */
export interface PendingBlocker {
  type: "BREAK" | "MEETING";
  id: string;
  date: string;
  category: string;
  userId: string;
  userName: string;
  approverId: string | null;
  approverName: string | null;
  approverRole: string | null;
  /** False when the approver left (deactivated or deleted): a Super Admin decides it. */
  approverActive: boolean;
  dueAt: string | null;
  escalated: boolean;
}

/** A working day still open in the month (no End Day yet). */
export interface OpenSessionBlocker {
  userId: string;
  userName: string;
  date: string;
  startedAt: string;
}

/** A leave request with a day in the month, still waiting for a decision (3.4). */
export interface PendingLeaveBlocker {
  id: string;
  userId: string;
  userName: string;
  category: "CLSL" | "ELPL";
  startDate: string;
  endDate: string;
  days: number;
}

export interface MonthLockBlockers {
  items: PendingBlocker[];
  /** More pending items exist than are listed. */
  moreItems: boolean;
  openSessions: OpenSessionBlocker[];
  /** 3.4: leave waiting for a decision, and how many there are. */
  leave?: PendingLeaveBlocker[];
  pendingLeave?: number;
}

export interface MonthLockView {
  month: string;
  locked: boolean;
  lockedAt: string | null;
  lockedByName: string | null;
  /** Items dated in the month that are still pending. */
  pending: number;
  /** What holds the lock, by name (3.2). Empty once locked. */
  blockers?: MonthLockBlockers;
}

/**
 * A team report narrows by department (4.0, `departmentId`, which the team
 * endpoints take natively) or by picked people (`userIds`).
 */
export interface TeamDayParams {
  date: string;
  departmentId?: string;
  userIds?: string[];
}

export interface TeamMonthParams {
  month: string;
  departmentId?: string;
  userIds?: string[];
}
