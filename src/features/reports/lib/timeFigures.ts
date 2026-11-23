import { formatDuration } from "@/lib/format/duration";
import type { MonthTotals, PersonDayReport, PersonDaySummary } from "@/features/reports/types";

/** Exactly what the brief asks to show wherever a paused person's payroll would appear. */
export const PAYROLL_PAUSED_LABEL = "Payroll paused · biometric integration pending";

export interface TimeFigure {
  label: "Working" | "Focus" | "Idle" | "Break" | "Meeting";
  /** Null: there is nothing to read (the input could not be read, or no agent reports). */
  sec: number | null;
}

const FIGURE_ORDER: TimeFigure["label"][] = ["Working", "Focus", "Idle", "Break", "Meeting"];

/** The five figures, always in this order, so every screen reads the same way. */
export function timeFigures(values: Record<TimeFigure["label"], number | null>): TimeFigure[] {
  return FIGURE_ORDER.map((label) => ({ label, sec: values[label] }));
}

/** A figure as text: "1h 05m", or "No data" when there is none to read. */
export function figureText(sec: number | null): string {
  return sec === null ? "No data" : formatDuration(sec);
}

/**
 * Working time: the working day less breaks, meetings included (brief 1.8). The reports keep
 * what is left without breaks and meetings, so the meetings are added back. Null on a month
 * locked before that was kept: its meeting time alone would read as the whole of it.
 */
export function workingSec(s: { availableSec?: number; meetingSec?: number }): number | null {
  if (s.availableSec === undefined) return null;
  return Math.max(0, s.availableSec + (s.meetingSec ?? 0));
}

/**
 * Idle time of a month: the sum of its days, each read like a single day (the server's). None
 * when no agent reported on any of them, or on a month locked before it was kept.
 */
export function monthIdleSec(t: Pick<MonthTotals, "idleSec">): number | null {
  return t.idleSec ?? null;
}

/**
 * Idle time of a day from its input. None when no agent reported on any of it (biometric staff,
 * an agent left off): nothing was read, and a zero would look like a day with no idle.
 */
export function idleOfInput(input: PersonDayReport["input"]): number | null {
  if (!input) return null;
  return input.activeSec === 0 && input.idleSec === 0 && input.noDataSec > 0 ? null : input.idleSec;
}

/** The figures of one day from its summary; idle comes from wherever that report reads it. */
export function dayFigures(
  s: Pick<PersonDaySummary, "focusSec" | "breakSec" | "meetingSec" | "availableSec">,
  idleSec: number | null | undefined,
): TimeFigure[] {
  return timeFigures({
    Working: workingSec(s),
    Focus: s.focusSec,
    Idle: idleSec ?? null,
    Break: s.breakSec,
    Meeting: s.meetingSec,
  });
}

/** The figures of a month from its totals. */
export function monthFigures(t: MonthTotals): TimeFigure[] {
  return timeFigures({
    Working: workingSec(t),
    Focus: t.focusSec,
    Idle: monthIdleSec(t),
    Break: t.breakSec ?? 0,
    Meeting: t.meetingSec ?? 0,
  });
}

/** "12 days left out of payroll, 1 Oct to 12 Oct"-style wording stays with its caller. */
export function pausedDaysText(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}
