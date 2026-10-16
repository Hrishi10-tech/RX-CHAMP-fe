import { crossesMidnight, spanHours, spanOf } from "@/features/teamToday/lib/hourly";

/**
 * The hour columns of a month's activity heatmap: every hour anyone was
 * active, in order. 00 to 23 (first to last active hour), unless some day's
 * work really ran past midnight (a night shift): then around the clock, so the
 * night reads in one piece, 18 … 23, 0 … 3.
 */
export function heatmapHours(
  rows: { hours: ReadonlyArray<number | null | undefined> }[],
  days: { startedAt: string | null; endedAt: string | null }[],
): number[] {
  const busy = Array.from({ length: 24 }, () => false);
  for (const r of rows) {
    r.hours.forEach((m, h) => {
      if (h < 24 && typeof m === "number" && m > 0) busy[h] = true;
    });
  }
  if (days.some((d) => crossesMidnight(d.startedAt, d.endedAt))) return spanHours(spanOf(busy));
  const first = busy.indexOf(true);
  if (first < 0) return [];
  const last = busy.lastIndexOf(true);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
