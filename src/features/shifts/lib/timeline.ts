import type { BreakKind, ShiftBreakInput, ShiftRules } from "@/features/shifts/types";
import { hmToMinutes, minutesToHm } from "@/features/shifts/lib/time";

/** A horizontal span as percentages of the shift's length. */
export interface Span {
  left: number;
  width: number;
}

export interface TimelineBreak {
  kind: BreakKind;
  /** When the break may be started. */
  window: Span;
  /** The scheduled break itself. */
  slot: Span;
  /** When the agent rings (starting then is on time). */
  ring: Span;
  /** Some of it falls outside the shift's hours (drawn clipped). */
  clipped: boolean;
}

export interface TimelineTick {
  left: number;
  label: string;
}

export interface Timeline {
  /** Length of the shift in minutes. */
  spanMin: number;
  breaks: TimelineBreak[];
  /** Whole-hour marks inside the shift, thinned so labels never collide. */
  ticks: TimelineTick[];
}

export interface TimelineInput {
  start: string;
  end: string;
  breaks: Pick<
    ShiftBreakInput,
    "kind" | "enabled" | "startTime" | "durationMin" | "windowBeforeMin" | "windowAfterMin"
  >[];
  rules: Pick<ShiftRules, "ringLeadMin" | "ringDurationMin">;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Geometry for the shift timeline: each enabled break's window, slot and ring as
 * percentages of the shift, clipped to the shift's hours. A shift that ends at or
 * before its start runs past midnight, and clock times before the start then
 * belong to the next morning (as the API reads them).
 *
 * Returns null when the shift's own times are not usable yet.
 */
export function buildTimeline(
  input: TimelineInput,
  { maxTicks = 7, edgeGapPct = 7 }: { maxTicks?: number; edgeGapPct?: number } = {},
): Timeline | null {
  const s0 = hmToMinutes(input.start);
  let e0 = hmToMinutes(input.end);
  if (Number.isNaN(s0) || Number.isNaN(e0) || s0 === e0) return null;
  const overnight = e0 <= s0;
  if (overnight) e0 += 1440;
  const span = e0 - s0;

  const onShift = (hm: string) => {
    const m = hmToMinutes(hm);
    return overnight && m < s0 ? m + 1440 : m;
  };
  const clamp = (m: number) => Math.min(e0, Math.max(s0, m));
  const toSpan = (from: number, to: number): Span => {
    const a = clamp(from);
    const b = clamp(to);
    return {
      left: round2(((a - s0) / span) * 100),
      width: round2((Math.max(0, b - a) / span) * 100),
    };
  };

  const breaks: TimelineBreak[] = [];
  for (const b of input.breaks) {
    if (!b.enabled) continue;
    const st = onShift(b.startTime);
    if (Number.isNaN(st)) continue;
    const open = st - b.windowBeforeMin;
    const close = st + b.windowAfterMin;
    const ringFrom = st - input.rules.ringLeadMin;
    const ringTo = ringFrom + input.rules.ringDurationMin;
    const end = st + b.durationMin;
    breaks.push({
      kind: b.kind,
      window: toSpan(open, close),
      slot: toSpan(st, end),
      ring: toSpan(ringFrom, ringTo),
      clipped: open < s0 || close > e0 || st < s0 || end > e0,
    });
  }

  const hours = span / 60;
  const step = Math.max(1, Math.ceil(hours / maxTicks));
  const ticks: TimelineTick[] = [];
  for (let m = Math.ceil(s0 / 60) * 60; m <= e0; m += step * 60) {
    const left = round2(((m - s0) / span) * 100);
    // The shift's start and end are labelled at the edges; keep hour marks clear of them.
    if (left < edgeGapPct || left > 100 - edgeGapPct) continue;
    ticks.push({ left, label: minutesToHm(m) });
  }

  return { spanMin: span, breaks, ticks };
}
