import { formatDuration } from "@/lib/format/duration";
import { monthOfDate } from "@/lib/time/months";
import type { MyMonthReport } from "@/features/reports/types";

/**
 * The month against its target (3.6, D-86), as the desktop agent's and the phone app's
 * History. The target is the whole month's (`plannedSec`, future working days included);
 * a server before 3.6 sends only `expectedSec`, the target so far, which on a month locked
 * before 3.6 is the whole month. `track` compares focus time with the targets of the days
 * before today; `left` is what is still to do and on how many working days, today counting
 * until the day has ended.
 */
export interface MonthPace {
  /** Seconds; 0 when the month has no target. */
  target: number;
  targetText: string;
  track: string | null;
  trackTone: "success" | "warning" | "neutral";
  left: string | null;
  /** Where the target so far sits on the month's meter (0..1), or null. */
  mark: number | null;
}

/** Under a minute either way is on target. */
const SLACK_SEC = 60;

export function monthPace(
  r: Pick<MyMonthReport, "month" | "totals" | "days">,
  today: string,
): MonthPace {
  const focus = Math.max(0, r.totals.focusSec || 0);
  const planned = r.totals.plannedSec ?? null;
  const current = r.month === monthOfDate(today);
  const target = planned ?? r.totals.expectedSec ?? 0;
  if (!(target > 0)) {
    return {
      target: 0,
      targetText: "No target this month",
      track: null,
      trackTone: "neutral",
      left: null,
      mark: null,
    };
  }
  const targetText =
    planned === null && current
      ? `of ${formatDuration(target)} due so far`
      : `of ${formatDuration(target)} target`;
  if (!current) {
    const short = target - focus;
    return {
      target,
      targetText,
      track: short < SLACK_SEC ? "Target met" : `Short by ${formatDuration(short)}`,
      trackTone: short < SLACK_SEC ? "success" : "warning",
      left: null,
      mark: null,
    };
  }
  const due = r.days
    .filter((d) => d.date < today)
    .reduce((sum, d) => sum + Math.max(0, d.expectedSec || 0), 0);
  const behind = due - focus;
  const toGo = target - focus;
  const daysLeft = r.days.filter((d) => {
    if (d.date < today || !d.workday) return false;
    if ((d.plannedSec ?? d.expectedSec) <= 0) return false;
    return d.date > today || d.endedAt === null;
  }).length;
  let left: string | null = null;
  if (toGo < SLACK_SEC) left = "Month's target reached";
  else if (planned !== null) {
    left = `${formatDuration(toGo)} to go · ${daysLeft} working day${daysLeft === 1 ? "" : "s"} left`;
  }
  return {
    target,
    targetText,
    track: behind < SLACK_SEC ? "On track" : `Behind by ${formatDuration(behind)}`,
    trackTone: behind < SLACK_SEC ? "success" : "warning",
    left,
    mark: planned === null ? null : Math.min(1, due / target),
  };
}
