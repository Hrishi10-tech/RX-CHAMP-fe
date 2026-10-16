/**
 * Mirrors the break views in backend/src/modules/shifts/application/shifts.types.ts.
 * "HH:MM" and "YYYY-MM-DD" values are business time; other timestamps are ISO instants.
 */
import type { BreakKind, ShiftRef, ShiftRules, ShiftSource } from "@/features/shifts/types";
import type { SkipNeedingComment } from "@/features/workday/types";

export type BreakPresenceType = "BREAK" | "LUNCH";

export type BreakTiming = "ON_TIME" | "EARLY" | "LATE" | "OUTSIDE_WINDOW" | "UNSCHEDULED";

export type BreakApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

export type ApproverRole = "SUPER_ADMIN" | "MANAGER";

/** 3.1: a record is a break taken, a break skipped, or one skipped automatically. */
export type BreakOutcome = "TAKEN" | "SKIPPED" | "AUTO_SKIPPED";

export interface BreakRecordView {
  id: string;
  date: string;
  kind: BreakKind | null;
  label: string;
  presenceType: BreakPresenceType;
  shiftName: string | null;
  scheduledStart: string | null;
  durationMin: number | null;
  startedAt: string;
  endedAt: string | null;
  inProgress: boolean;
  /** Seconds taken so far (running) or in total (finished). */
  tookSec: number;
  /** Seconds past the break's length (0 when within it). */
  overrunSec: number;
  timing: BreakTiming;
  minutesOff: number;
  reason: string | null;
  overrunReason: string | null;
  source: string;
  approvalStatus: BreakApprovalStatus;
  approverRole: ApproverRole | null;
  decidedAt: string | null;
  decisionNote: string | null;
  decidedByName: string | null;
  // ---- 3.1 (optional so a 3.0 answer still reads as a taken break) ----
  outcome?: BreakOutcome;
  /** The person asked their manager to count the minutes over the break. */
  overrunAsked?: boolean;
  /** When the comment on an auto-skip was added. */
  commentedAt?: string | null;
  dueAt?: string | null;
  /** A skip with no reason yet, still pending: the person must comment before End Day. */
  needsComment?: boolean;
}

export interface BreakSlotLocal {
  start: string;
  end: string;
  windowOpen: string;
  windowClose: string;
  ringStart: string;
  ringEnd: string;
}

export interface BreakSlotView {
  kind: BreakKind;
  label: string;
  presenceType: BreakPresenceType;
  durationMin: number;
  scheduledStart: string;
  scheduledEnd: string;
  windowOpen: string;
  windowClose: string;
  ringStart: string;
  ringEnd: string;
  local: BreakSlotLocal;
  /** The break as taken (or skipped) today, or null. */
  record: BreakRecordView | null;
  /** 3.1: the desktop app offers Skip break for this slot. */
  allowSkip?: boolean;
}

export interface MyBreakDayView {
  date: string;
  serverNow: string;
  timezone: string;
  /** SCHEDULED: follow the break slots. FREE: no schedule today (no shift, a day off, no breaks). */
  mode: "SCHEDULED" | "FREE";
  workday: boolean;
  /** End Day was pressed: no break can start until tomorrow. */
  dayEnded: boolean;
  shift: (ShiftRef & { rules: ShiftRules }) | null;
  source: ShiftSource;
  breaks: BreakSlotView[];
  /** Breaks that matched no slot (started by older agents). */
  unscheduled: BreakRecordView[];
  /** The break running right now, if any. */
  activeBreak: BreakRecordView | null;
  /** 3.1: skips still waiting for the person's comment, newest first. */
  skipsNeedingComment?: SkipNeedingComment[];
  reasonMinChars?: number;
}

export interface MyBreakHistoryView {
  from: string;
  to: string;
  items: BreakRecordView[];
}

export interface ApprovalPersonView {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export interface ApprovalItemView extends BreakRecordView {
  user: ApprovalPersonView;
  /** Whether the caller may decide this one (false for read-only rows). */
  canDecide: boolean;
}

export type ApprovalStatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export type ApprovalScope = "mine" | "all";

export interface GetApprovalsParams {
  status?: ApprovalStatusFilter;
  /** "YYYY-MM-DD"; omitted = any day. */
  date?: string;
  /** Only pending items from before today (status and date are then ignored). */
  overdue?: boolean;
  /** Super Admin: "all" = every team. */
  scope?: ApprovalScope;
  page?: number;
  limit?: number;
}

export interface ApprovalsSummaryView {
  date: string;
  pendingToday: number;
  overdue: number;
  approvedToday: number;
  rejectedToday: number;
}

export interface BulkApproveResult {
  approved: string[];
  skipped: { id: string; reason: string }[];
}

/** SKIPPED and AUTO_SKIPPED are 3.1 cells: a skip record rather than a break. */
export type TeamCellStatus =
  | "UPCOMING"
  | "OPEN"
  | "IN_PROGRESS"
  | "TAKEN"
  | "SKIPPED"
  | "AUTO_SKIPPED"
  | "MISSED";

export interface TeamBreakCellView {
  kind: BreakKind;
  label: string;
  localStart: string;
  status: TeamCellStatus;
  record: BreakRecordView | null;
}

export interface TeamBreakRowView {
  user: ApprovalPersonView;
  shift: ShiftRef | null;
  source: ShiftSource;
  workday: boolean;
  cells: TeamBreakCellView[];
  unscheduled: BreakRecordView[];
  pending: number;
}

export interface TeamBreakTotals {
  people: number;
  taken: number;
  late: number;
  early: number;
  missed: number;
  overrun: number;
  pending: number;
  /** 3.1: breaks skipped by hand or automatically. */
  skipped?: number;
}

export interface TeamBreaksView {
  date: string;
  rows: TeamBreakRowView[];
  totals: TeamBreakTotals;
}

export interface GetTeamBreaksParams {
  date?: string;
  /** Super Admin: one manager's team; omitted = everyone. */
  managerId?: string;
}
