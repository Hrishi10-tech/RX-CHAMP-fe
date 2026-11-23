import type { ChipTone } from "@/components/ui/Chip";
import { formatTime12 } from "@/lib/time/format";
import type {
  LeaveCategory,
  LeaveDraft,
  LeaveKind,
  LeavePart,
  LeaveRequestView,
  LeaveStatus,
} from "@/features/leave/types";

/** "1 day", "0.5 day", "2.25 days", "−1.5 days"; signed: "+2 days". A real minus sign. */
export function daysText(days: number, opts: { signed?: boolean } = {}): string {
  const abs = Math.abs(days);
  const n = Number.isInteger(abs) ? String(abs) : String(Number(abs.toFixed(2)));
  const word = abs !== 0 && abs <= 1 ? "day" : "days";
  const sign = days < 0 ? "−" : opts.signed && days > 0 ? "+" : "";
  return `${sign}${n} ${word}`;
}

/** "10.5" with a real minus sign, for the big numbers. */
export function daysNumber(days: number): string {
  const abs = Math.abs(days);
  const n = Number.isInteger(abs) ? String(abs) : String(Number(abs.toFixed(2)));
  return days < 0 ? `−${n}` : n;
}

export const CATEGORY_TEXT: Record<LeaveCategory, { label: string; name: string; tone: ChipTone }> =
  {
    CLSL: { label: "CL/SL", name: "Casual or sick leave", tone: "info" },
    ELPL: { label: "EL/PL", name: "Earned or privilege leave", tone: "violet" },
    /** 3.5: charged against comp off credits, not a yearly pool. */
    COMPOFF: {
      label: "Comp off",
      name: "Compensatory off for an extra day worked",
      tone: "success",
    },
  };

export const STATUS_LOOK: Record<LeaveStatus, { label: string; tone: ChipTone }> = {
  PENDING: { label: "Waiting for approval", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Not approved", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  REVOKED: { label: "Revoked", tone: "danger" },
};

export const KIND_OPTIONS: { value: LeaveKind; label: string }[] = [
  { value: "FULL_DAY", label: "Full day" },
  { value: "HALF_DAY", label: "Half day" },
  { value: "QUARTER_DAY", label: "Quarter day" },
];

export const PART_OPTIONS: Record<
  Exclude<LeaveKind, "FULL_DAY">,
  { value: LeavePart; label: string }[]
> = {
  HALF_DAY: [
    { value: "FIRST_HALF", label: "First half" },
    { value: "SECOND_HALF", label: "Second half" },
  ],
  QUARTER_DAY: [
    { value: "Q1", label: "1st" },
    { value: "Q2", label: "2nd" },
    { value: "Q3", label: "3rd" },
    { value: "Q4", label: "4th" },
  ],
};

export const REASON_MIN = 3;
export const REASON_MAX = 300;
export const NOTE_MIN = 3;
export const NOTE_MAX = 300;
export const ADJUST_REASON_MIN = 5;

/** The draft's own problems (the server checks the rest). */
export function draftProblems(
  d: LeaveDraft,
): Partial<Record<"part" | "startDate" | "endDate" | "reason", string>> {
  const out: Partial<Record<"part" | "startDate" | "endDate" | "reason", string>> = {};
  if (d.kind !== "FULL_DAY" && !d.part) {
    out.part = d.kind === "HALF_DAY" ? "Pick the first or the second half." : "Pick which quarter.";
  }
  if (!d.startDate) out.startDate = "Pick the first day.";
  if (d.kind === "FULL_DAY" && d.endDate && d.startDate && d.endDate < d.startDate) {
    out.endDate = "The last day is before the first day.";
  }
  const reason = d.reason.trim();
  if (reason.length < REASON_MIN) out.reason = `Give a reason, at least ${REASON_MIN} characters.`;
  else if (reason.length > REASON_MAX) out.reason = `Keep it under ${REASON_MAX} characters.`;
  return out;
}

/** The requests still holding days: waiting, or approved and not over. */
export function isUpcoming(r: LeaveRequestView, today: string): boolean {
  return (r.status === "PENDING" || r.status === "APPROVED") && r.endDate >= today;
}

/** "Half day, first half" for a part day; "3 days" for a range. */
export function amountText(r: Pick<LeaveRequestView, "kind" | "kindLabel" | "days">): string {
  if (r.kind === "FULL_DAY") return daysText(r.days);
  return r.kindLabel.replace(" (", ", ").replace(")", "");
}

/**
 * A part day's hours on the 12 hour clock (4.0): the API sends "09:30 to 14:00";
 * people read "9:30 AM to 2:00 PM". Anything else is shown as it came.
 */
export function partTimesText(partTimes: string | null | undefined): string {
  if (!partTimes) return "";
  const m = /^\s*(\d{1,2}:\d{2})\s+to\s+(\d{1,2}:\d{2})\s*$/.exec(partTimes);
  if (!m) return partTimes;
  const from = formatTime12(m[1]);
  const to = formatTime12(m[2]);
  return from && to ? `${from} to ${to}` : partTimes;
}
