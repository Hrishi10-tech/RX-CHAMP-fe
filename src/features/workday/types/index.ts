import type { DayLeaveView } from "@/features/leave/types";
import type { WorkdayWfhView } from "@/features/wfh/types";
/**
 * Mirrors SPEC 3.1 section 3.1 (Work day). Every `date` is a business-zone day key
 * "YYYY-MM-DD"; every other timestamp is an ISO instant; durations are seconds.
 */
import type { BreakKind } from "@/features/shifts/types";

export type WorkdayState = "NOT_STARTED" | "OPEN" | "ENDED";

export type WorkSessionEndReason = "USER" | "AUTO_CLOSED";

export interface WorkSessionView {
  startedAt: string;
  endedAt: string | null;
  endReason: WorkSessionEndReason | null;
  /** 3.5: AGENT, LEGACY, BACKFILL, BIOMETRIC (punches) or MOBILE_WFH (the phone); absent before 3.5. */
  source?: string;
}

/** 3.5: one punch of a biometric person's day. */
export interface WorkdayPunchView {
  at: string;
  direction: "IN" | "OUT" | null;
  deviceId: string;
  source: string;
  voided: boolean;
}

/** Focus time at `serverNow`, with what pending approvals could still change. */
export interface FocusView {
  focusSec: number;
  /** The day is open and the person is not on a break or lunch (meetings tick). */
  running: boolean;
  spanSec: number;
  breakSec: number;
  meetingSec: number;
  approvedPlusSec: number;
  pendingPlusSec: number;
  rejectedMinusSec: number;
  pendingMinusSec: number;
  /** 3.3: signed seconds added by hand by the Super Manager; absent from older servers. */
  adjustedSec?: number;
  /** 3.5: time worked from home on the phone that counted, the part beyond the day's cap, and what is left of the cap while it runs. */
  wfhSec?: number;
  wfhOverSec?: number;
  capRemainingSec?: number | null;
}

export interface SkipNeedingComment {
  id: string;
  date: string;
  kind: BreakKind;
  label: string;
  outcome: "SKIPPED" | "AUTO_SKIPPED";
  skippedAt: string;
  scheduledStart: string | null;
  durationMin: number | null;
  minChars: number;
}

export interface WorkdayShiftRef {
  id: string;
  name: string;
  start: string;
  end: string;
}

export interface WorkdayTodayView {
  date: string;
  serverNow: string;
  timezone: string;
  state: WorkdayState;
  /** First session start today. */
  startedAt: string | null;
  /** Last session end, when ENDED. */
  endedAt: string | null;
  /** The last session today was closed automatically. */
  autoClosed: boolean;
  sessions: WorkSessionView[];
  focus: FocusView;
  /**
   * null = on time, or no shift. 3.2: the allowance, the reason once given, and
   * whether one is still asked for.
   */
  lateStart: {
    minutes: number;
    graceMin?: number;
    reason?: string | null;
    reasonAt?: string | null;
    needsReason?: boolean;
  } | null;
  /** 3.2: a holiday (with its name) or a weekly day off; null on a working day. */
  dayOff?: { kind: "HOLIDAY" | "WEEKLY_OFF"; name: string | null } | null;
  shift: WorkdayShiftRef | null;
  expectedSec: number;
  /** 3.4: leave today (approved, and any still waiting); a part day leaves the rest to work. */
  leave?: DayLeaveView | null;
  /** 3.4: with part-day leave, the part of the shift still to work. */
  workingFrom?: string | null;
  workingUntil?: string | null;
  /** Newest first, at most 31 days back. */
  skipsNeedingComment: SkipNeedingComment[];
  /** MANAGER and SUPER_ADMIN: pending items routed to me past their due time. */
  overdueApprovals: number;
  endDayBlockedByOverdue: boolean;
  settings: {
    approvalSlaHours: number;
    reasonMinChars: number;
    lateStartGraceMin?: number;
    requireLateStartReason?: boolean;
    forgottenEndDayIdleMin?: number;
    paidBreakBufferMin?: number;
  };
  portalUrl: string | null;
  /** 3.5: how the day is recorded, work from home, and a biometric person's punches. */
  attendance?: { source: "AGENT" | "BIOMETRIC"; biometricCode: string | null };
  wfh?: WorkdayWfhView | null;
  punches?: WorkdayPunchView[];
  checkoutMissing?: boolean;
}

/** GET /workday/guide (3.2): how RX Vision works, with the organisation's numbers. */
export interface StaffGuideView {
  items: { n: number; title: string; body: string }[];
  numbers: Record<string, number>;
}
