import { formatSignedAmount } from "@/lib/format/duration";
import type { FocusView } from "@/features/workday/types";

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Focus seconds right now: the server's figure at the time it was read, carried
 * forward while the clock is running (day open, not on a break). `fetchedAt` is
 * when the answer arrived (browser ms), so the browser's own clock offset never
 * matters, only the time elapsed since.
 */
export function liveFocusSec(
  focus: Pick<FocusView, "focusSec" | "running"> | null | undefined,
  fetchedAt: number,
  now: number = Date.now(),
): number {
  if (!focus) return 0;
  const base = Math.max(0, finite(focus.focusSec));
  if (!focus.running || !fetchedAt) return base;
  return base + Math.max(0, Math.floor((now - fetchedAt) / 1000));
}

/**
 * What pending approvals could still do to focus time, in the words the agent
 * uses: "+15 min if approved", "−20 min if rejected". Nothing pending, no lines.
 */
export function pendingEffectLines(
  focus: Pick<FocusView, "pendingPlusSec" | "pendingMinusSec"> | null | undefined,
): { tone: "plus" | "minus"; text: string }[] {
  if (!focus) return [];
  const lines: { tone: "plus" | "minus"; text: string }[] = [];
  const plus = Math.max(0, finite(focus.pendingPlusSec));
  const minus = Math.max(0, finite(focus.pendingMinusSec));
  if (plus >= 60) lines.push({ tone: "plus", text: `${formatSignedAmount(plus)} if approved` });
  if (minus >= 60) lines.push({ tone: "minus", text: `${formatSignedAmount(-minus)} if rejected` });
  return lines;
}

/** What decisions already did: "+11 min approved back", "−15 min taken off". */
export function decidedEffectLines(
  focus: Pick<FocusView, "approvedPlusSec" | "rejectedMinusSec"> | null | undefined,
): { tone: "plus" | "minus"; text: string }[] {
  if (!focus) return [];
  const lines: { tone: "plus" | "minus"; text: string }[] = [];
  const plus = Math.max(0, finite(focus.approvedPlusSec));
  const minus = Math.max(0, finite(focus.rejectedMinusSec));
  if (plus >= 60) lines.push({ tone: "plus", text: `${formatSignedAmount(plus)} approved back` });
  if (minus >= 60) lines.push({ tone: "minus", text: `${formatSignedAmount(-minus)} taken off` });
  return lines;
}
