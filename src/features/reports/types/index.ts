/**
 * Mirrors SPEC 3.1 section 3.7 (Reports). Day keys "YYYY-MM-DD", month keys
 * "YYYY-MM", instants ISO, durations in seconds unless named ...Min.
 */
import type { HourActivity } from "@/features/activity/types/hourly";
import type { ApprovalItemView } from "@/features/approvals/types";
import type { BreakRecordView } from "@/features/breaks/types";
import type { MeetingRecordView } from "@/features/meetings/types";
import type { BreakKind, ShiftRef } from "@/features/shifts/types";

export type DayClass = "FULL" | "HALF" | "ABSENT" | "OFF" | "EXTRA" | "IN_PROGRESS" | "UPCOMING";

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
  lateStart: { minutes: number } | null;
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
  skipped: number;
  autoSkipped: number;
  overruns: number;
  meetings: number;
  approvedPlusSec: number;
  rejectedMinusSec: number;
  pending: number;
  quietHours: number;
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

export interface MonthLockView {
  month: string;
  locked: boolean;
  lockedAt: string | null;
  lockedByName: string | null;
  /** Items dated in the month that are still pending. */
  pending: number;
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
