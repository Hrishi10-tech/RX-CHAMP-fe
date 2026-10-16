import type { ChipTone } from "@/components/ui/Chip";
import { formatSignedAmount, withMinusSign } from "@/lib/format/duration";
import { dateKeyOf, formatDay, hmOf, todayKey } from "@/lib/time/businessTime";
import type {
  ApprovalCategory,
  ApprovalEffect,
  ApprovalItemStatus,
  ApprovalItemView,
} from "@/features/approvals/types";

// ---- Categories ------------------------------------------------------------------

/** The chip on each row. */
export const CATEGORY_LABEL: Record<ApprovalCategory, string> = {
  BREAK_EARLY: "Started early",
  BREAK_LATE: "Started late",
  BREAK_OUTSIDE: "Outside the window",
  BREAK_UNSCHEDULED: "Unscheduled break",
  BREAK_OVERRUN: "Back late",
  BREAK_SKIP: "Skipped",
  BREAK_AUTO_SKIP: "Auto-skipped",
  MEETING_LIVE: "Live meeting",
  MEETING_PAST: "Logged meeting",
};

/** The longer wording in the Type filter. */
export const CATEGORY_FILTER_LABEL: Record<ApprovalCategory, string> = {
  BREAK_EARLY: "Break started early",
  BREAK_LATE: "Break started late",
  BREAK_OUTSIDE: "Break outside its window",
  BREAK_UNSCHEDULED: "Unscheduled break",
  BREAK_OVERRUN: "Back late from a break",
  BREAK_SKIP: "Break skipped",
  BREAK_AUTO_SKIP: "Break auto-skipped",
  MEETING_LIVE: "Meeting started live",
  MEETING_PAST: "Meeting logged afterwards",
};

const CATEGORY_TONE: Record<ApprovalCategory, ChipTone> = {
  BREAK_EARLY: "warning",
  BREAK_LATE: "warning",
  BREAK_OUTSIDE: "danger",
  BREAK_UNSCHEDULED: "neutral",
  BREAK_OVERRUN: "danger",
  BREAK_SKIP: "violet",
  BREAK_AUTO_SKIP: "neutral",
  MEETING_LIVE: "brand",
  MEETING_PAST: "brand",
};

/**
 * Label and colour for a category; one this portal does not know yet reads
 * plainly. A meeting started live reads "Live meeting" only while it runs; once
 * it has ended it is just a meeting.
 */
export function categoryChip(
  category: string,
  inProgress = false,
): { label: string; tone: ChipTone } {
  if (category === "MEETING_LIVE" && !inProgress) return { label: "Meeting", tone: "brand" };
  const known = category in CATEGORY_LABEL;
  return known
    ? {
        label: CATEGORY_LABEL[category as ApprovalCategory],
        tone: CATEGORY_TONE[category as ApprovalCategory],
      }
    : { label: category.replace(/_/g, " ").toLowerCase(), tone: "neutral" };
}

/** What the text box under a row holds: a reason, a comment, an agenda. */
export function reasonLabel(category: ApprovalCategory): string {
  if (category === "MEETING_LIVE" || category === "MEETING_PAST") return "Agenda";
  if (category === "BREAK_OVERRUN") return "Why it ran over";
  if (category === "BREAK_AUTO_SKIP") return "Comment";
  return "Reason";
}

export const NO_COMMENT_TEXT = "No comment yet";

// ---- Status ------------------------------------------------------------------------

export const STATUS_CHIP: Record<ApprovalItemStatus, { label: string; tone: ChipTone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

// ---- Due time ----------------------------------------------------------------------

export interface DueChip {
  text: string;
  tone: ChipTone;
  /** Longer wording for a tooltip and screen readers. */
  title: string;
}

/** The 12-hour line after which an item is "due soon" (SPEC 1.7). */
export const DUE_SOON_SEC = 12 * 3600;

function hoursOrMinutes(sec: number): string {
  if (sec >= 3600) return `${Math.floor(sec / 3600)}h`;
  return `${Math.max(1, Math.round(sec / 60))} min`;
}

/**
 * The due chip: "Due in 31h" (grey), "Due in 5h" (amber, 12 hours or less),
 * "Overdue 6h" (red), "Escalated" (red, past due and sent to the Super Admins).
 * Decided items have none. Reads the server's `dueInSec` when it sent one, so a
 * wrong clock in the browser cannot move a deadline; otherwise works it out
 * from `dueAt` and `now`.
 */
export function dueChip(
  item: Pick<
    ApprovalItemView,
    "status" | "dueAt" | "dueInSec" | "dueSoon" | "overdue" | "escalated"
  >,
  now: number = Date.now(),
): DueChip | null {
  if (item.status !== "PENDING") return null;
  let left: number | null =
    typeof item.dueInSec === "number" && Number.isFinite(item.dueInSec) ? item.dueInSec : null;
  if (left === null && item.dueAt) {
    const due = Date.parse(item.dueAt);
    if (!Number.isNaN(due)) left = Math.round((due - now) / 1000);
  }
  if (left === null) return null;

  const overdue = item.overdue || left <= 0;
  if (item.escalated) {
    return {
      text: "Escalated",
      tone: "danger",
      title: `Overdue ${hoursOrMinutes(Math.max(0, -left))}. Sent to the Super Admins.`,
    };
  }
  if (overdue) {
    const over = hoursOrMinutes(Math.max(0, -left));
    return { text: `Overdue ${over}`, tone: "danger", title: `Overdue by ${over}` };
  }
  const due = hoursOrMinutes(left);
  const soon = item.dueSoon || left <= DUE_SOON_SEC;
  return {
    text: `Due in ${due}`,
    tone: soon ? "warning" : "neutral",
    title: soon ? `Due soon: decide within ${due}` : `Decide within ${due}`,
  };
}

// ---- Effect on focus time -------------------------------------------------------------

/** The effect line when the server sent none, in the server's words. */
export function fallbackEffectText(effect: ApprovalEffect, status: ApprovalItemStatus): string {
  const minutes = Math.max(0, Math.round(effect.minutes || 0));
  if (effect.mode === "NONE" || minutes === 0) return "No change to focus time";
  const amount = formatSignedAmount((effect.mode === "PLUS" ? 1 : -1) * minutes * 60);
  if (effect.mode === "PLUS") {
    if (status === "PENDING") return `${amount} if approved`;
    if (status === "APPROVED") return `${amount} added`;
    return `${amount.replace("+", "")} left out`;
  }
  if (status === "PENDING") return `${amount} if rejected`;
  if (status === "REJECTED") return `${amount} taken off`;
  return "Counted as focus time";
}

/**
 * The effect chip: the server's text (with a true minus sign), coloured by what
 * it means. Pending: green for minutes a yes adds back, red for minutes a no
 * takes off. Decided: filled when the minutes moved, grey when nothing did.
 */
export function effectChip(item: Pick<ApprovalItemView, "effect" | "status">): {
  text: string;
  tone: ChipTone;
} {
  const effect: ApprovalEffect = item.effect ?? { mode: "NONE", minutes: 0, text: "" };
  const server = typeof effect.text === "string" ? effect.text.trim() : "";
  const text = server ? withMinusSign(server) : fallbackEffectText(effect, item.status);
  if (effect.mode === "NONE" || !effect.minutes) return { text, tone: "neutral" };
  if (item.status === "PENDING")
    return { text, tone: effect.mode === "PLUS" ? "success" : "danger" };
  if (item.status === "APPROVED") {
    return { text, tone: effect.mode === "PLUS" ? "successSolid" : "neutral" };
  }
  return { text, tone: effect.mode === "MINUS" ? "dangerSolid" : "neutral" };
}

// ---- Decisions ------------------------------------------------------------------------

/** "Approved by Maya Reddy at 12:05", or "on 12 Oct, 18:20" for an earlier day. */
export function decidedLine(
  item: Pick<ApprovalItemView, "status" | "decidedAt" | "decidedByName">,
  today: string = todayKey(),
): string | null {
  if (item.status !== "APPROVED" && item.status !== "REJECTED") return null;
  const verb = item.status === "APPROVED" ? "Approved" : "Rejected";
  const by = item.decidedByName ? ` by ${item.decidedByName}` : "";
  if (!item.decidedAt) return `${verb}${by}`;
  const at = new Date(item.decidedAt);
  if (Number.isNaN(at.getTime())) return `${verb}${by}`;
  const day = dateKeyOf(at);
  const when =
    day === today ? `at ${hmOf(item.decidedAt)}` : `on ${formatDay(day)}, ${hmOf(item.decidedAt)}`;
  return `${verb}${by} ${when}`;
}

/**
 * Whether the signed-in person may reopen a decided item: whoever decided it,
 * or any Super Admin (the API checks again). Matched by id; an API that does
 * not send `decidedById` falls back to the decider's name.
 */
export function mayReopen(
  item: Pick<ApprovalItemView, "status" | "decidedById" | "decidedByName">,
  me: { id?: string; name?: string; isSuperAdmin: boolean },
): boolean {
  if (item.status !== "APPROVED" && item.status !== "REJECTED") return false;
  if (me.isSuperAdmin) return true;
  const byId = (item as { decidedById?: string | null }).decidedById;
  if (byId !== undefined) return Boolean(me.id) && byId === me.id;
  return Boolean(item.decidedByName) && item.decidedByName === me.name;
}

/** The person's first name, for "Asha sees this note". */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "They";
}

// ---- Live meetings ------------------------------------------------------------------------

/** "4:05", "24:05", "1:04:05": a running timer. */
export function formatTimer(totalSec: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(totalSec) ? totalSec : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** How long a live meeting has run: the server's seconds plus the time since they were read. */
export function liveSeconds(
  durationSec: number,
  fetchedAt: number,
  now: number = Date.now(),
): number {
  const base = Math.max(0, Number.isFinite(durationSec) ? durationSec : 0);
  if (!fetchedAt) return base;
  return base + Math.max(0, Math.floor((now - fetchedAt) / 1000));
}

// ---- Bulk bar ------------------------------------------------------------------------------

/**
 * One line on what the visible pending items can still do: "4 waiting, 1
 * overdue. Approving can add +20 min. Rejecting can remove up to −1h 30m."
 */
export function atStakeText(
  items: Pick<ApprovalItemView, "status" | "overdue" | "escalated" | "effect">[],
): string {
  const pending = items.filter((i) => i.status === "PENDING");
  if (pending.length === 0) return "Nothing waiting.";
  const overdue = pending.filter((i) => i.overdue || i.escalated).length;
  const minutesOf = (mode: "PLUS" | "MINUS") =>
    pending
      .filter((i) => i.effect?.mode === mode)
      .reduce((sum, i) => sum + Math.max(0, Math.round(i.effect.minutes || 0)), 0);
  const plus = minutesOf("PLUS");
  const minus = minutesOf("MINUS");
  const parts = [`${pending.length} waiting${overdue ? `, ${overdue} overdue` : ""}.`];
  if (plus) parts.push(`Approving can add ${formatSignedAmount(plus * 60)}.`);
  if (minus) parts.push(`Rejecting can remove up to ${formatSignedAmount(-minus * 60)}.`);
  return parts.join(" ");
}
