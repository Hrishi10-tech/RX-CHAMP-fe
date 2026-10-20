/**
 * Mirrors SPEC 3.1 section 3.4 (Approvals): break records and meeting records
 * that need, or got, a manager's decision. Instants are ISO; `date` is a
 * business day key; durations are seconds.
 */
import type { BreakRecordView } from "@/features/breaks/types";
import type { MeetingParticipant, MeetingRecordView } from "@/features/meetings/types";

/** AWAY (4.0): time away from the keyboard and mouse with a reason (SPEC 2.5, 5.7). */
export type ApprovalType = "BREAK" | "MEETING" | "AWAY";

export type ApprovalCategory =
  // A break started off schedule.
  | "BREAK_EARLY"
  | "BREAK_LATE"
  | "BREAK_OUTSIDE"
  | "BREAK_UNSCHEDULED"
  // Asked to count the minutes over a break.
  | "BREAK_OVERRUN"
  | "BREAK_SKIP"
  | "BREAK_AUTO_SKIP"
  | "MEETING_LIVE"
  | "MEETING_PAST"
  // 4.0: away time with a reason other than a break.
  | "AWAY_THINKING"
  | "AWAY_MEETING"
  | "AWAY_HARDWARE"
  | "AWAY_OTHER"
  | "AWAY_CUSTOM";

export const APPROVAL_CATEGORIES: ApprovalCategory[] = [
  "BREAK_EARLY",
  "BREAK_LATE",
  "BREAK_OUTSIDE",
  "BREAK_UNSCHEDULED",
  "BREAK_OVERRUN",
  "BREAK_SKIP",
  "BREAK_AUTO_SKIP",
  "MEETING_LIVE",
  "MEETING_PAST",
  "AWAY_THINKING",
  "AWAY_MEETING",
  "AWAY_HARDWARE",
  "AWAY_OTHER",
  "AWAY_CUSTOM",
];

/** An away item's own fields (SPEC 3.1 AwayEvent, 5.7). */
export interface AwayItemView {
  id?: string;
  reasonKey: string | null;
  reasonKind: string | null;
  /** "Thinking", "Short meeting", or a custom reason's label. */
  reasonLabel: string | null;
  comment: string | null;
  /** For an away meeting: who was in it (names, or `{ name }`). */
  participants?: (string | { id?: string; name?: string | null })[] | null;
  momSender: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  seconds?: number | null;
}

export type ApprovalEffectMode = "PLUS" | "MINUS" | "NONE";

/**
 * What a decision does to focus time. `text` is the server's line, e.g.
 * "+15 min if approved", "−15 min if rejected", "No change to focus time", and
 * after a decision "+15 min added", "−15 min taken off", "Counted as focus time".
 */
export interface ApprovalEffect {
  mode: ApprovalEffectMode;
  minutes: number;
  text: string;
}

export type ApprovalItemStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalPerson {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export interface ApprovalItemView {
  type: ApprovalType;
  id: string;
  /** The overrun wins over early or late when both apply. */
  category: ApprovalCategory;
  user: ApprovalPerson;
  date: string;
  /** "Morning break skipped", "Back 15 min late from lunch", "Meeting: Sprint review". */
  title: string;
  /** One line: when and how long. */
  detail: string;
  /** The staff reason, comment, overrun reason or meeting agenda. */
  reason: string | null;
  /** An auto-skip still waiting for the person's comment. */
  needsComment: boolean;
  /** Meetings only, else []. */
  participants: MeetingParticipant[];
  startedAt: string;
  endedAt: string | null;
  inProgress: boolean;
  durationSec: number;
  effect: ApprovalEffect;
  status: ApprovalItemStatus;
  createdAt: string;
  dueAt: string | null;
  /** Negative when overdue. */
  dueInSec: number | null;
  dueSoon: boolean;
  overdue: boolean;
  escalated: boolean;
  decidedAt: string | null;
  /** Who decided it: Reopen is theirs (or any Super Admin's). */
  decidedById: string | null;
  decidedByName: string | null;
  decisionNote: string | null;
  /** False for read-only rows and live meetings. */
  canDecide: boolean;
  /** Dated in a month locked for payroll. */
  locked: boolean;
  break: BreakRecordView | null;
  meeting: MeetingRecordView | null;
  /** 4.0: AWAY items. */
  away?: AwayItemView | null;
  /** 4.0: who will mail the minutes, for meetings and away meetings (SPEC 2.9). */
  momSender?: string | null;
  /**
   * Portal only, never sent by the API: when this copy of the item arrived
   * (browser clock, ms). `dueInSec` and a live meeting's `durationSec` were true
   * at that moment, so countdowns and timers run from it, whatever happens to
   * the list around the row (optimistic updates, other rows' decisions).
   */
  receivedAt?: number;
  /**
   * Portal only: set on a row's optimistic copy (a decision not yet confirmed)
   * and gone once the server's answer or a fresh read replaces it, so a failure
   * undoes only its own, still unconfirmed, change.
   */
  optimistic?: string;
}

export type ApprovalStatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "DECIDED" | "ALL";

export type ApprovalScope = "mine" | "all";

/** `GET /approvals` query. Defaults on the server: status PENDING, scope mine. */
export interface GetApprovalsParams {
  status?: ApprovalStatusFilter;
  /** Super Admin only; Managers always get "mine". */
  scope?: ApprovalScope;
  type?: ApprovalType;
  category?: ApprovalCategory;
  /** Only pending items past their due time. */
  overdue?: boolean;
  /** "YYYY-MM-DD". */
  date?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface ApprovalsSummary {
  pending: number;
  dueSoon: number;
  overdue: number;
  escalated: number;
  approvedToday: number;
  rejectedToday: number;
  slaHours: number;
}

export interface ApprovalRef {
  type: ApprovalType;
  id: string;
}

export interface BulkApproveResult {
  approved: ApprovalRef[];
  skipped: (ApprovalRef & { reason: string })[];
}
