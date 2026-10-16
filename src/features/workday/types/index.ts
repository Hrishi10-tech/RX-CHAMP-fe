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
  /** null = on time, or no shift. */
  lateStart: { minutes: number } | null;
  shift: WorkdayShiftRef | null;
  expectedSec: number;
  /** Newest first, at most 31 days back. */
  skipsNeedingComment: SkipNeedingComment[];
  /** MANAGER and SUPER_ADMIN: pending items routed to me past their due time. */
  overdueApprovals: number;
  endDayBlockedByOverdue: boolean;
  settings: { approvalSlaHours: number; reasonMinChars: number };
  portalUrl: string | null;
}
