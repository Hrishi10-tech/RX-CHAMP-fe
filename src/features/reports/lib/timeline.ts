import type { ReportSkip, TimelineKind, TimelineSegment } from "@/features/reports/types";

export interface PlacedSegment {
  kind: TimelineKind;
  label: string;
  startedAt: string;
  endedAt: string;
  /** Percent of the bar from the left. */
  left: number;
  /** Percent of the bar's width. */
  width: number;
  seconds: number;
}

export interface PlacedMarker {
  at: string;
  label: string;
  left: number;
}

export interface TimelineLayout {
  /** Whole hours (epoch ms) the bar runs from and to. */
  startMs: number;
  endMs: number;
  segments: PlacedSegment[];
  markers: PlacedMarker[];
  /** Every whole hour on the bar, with its position. */
  ticks: { ms: number; left: number }[];
  totals: Partial<Record<TimelineKind, number>>;
}

const HOUR = 3600_000;

function ms(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Number.NaN : t;
}

/**
 * Places the day's segments on a bar that runs from the whole hour before the
 * first one to the whole hour after the last (the hours are business time,
 * which for a zone on a half hour, like IST, is not a UTC hour). Bad or empty
 * segments are dropped; null when nothing is left to draw.
 */
export function layoutTimeline(
  timeline: TimelineSegment[],
  skips: ReportSkip[] = [],
  zoneOffsetMs = 0,
): TimelineLayout | null {
  const valid = timeline
    .map((s) => ({ ...s, s: ms(s.startedAt), e: ms(s.endedAt) }))
    .filter((s) => Number.isFinite(s.s) && Number.isFinite(s.e) && s.e > s.s)
    .sort((a, b) => a.s - b.s);
  if (valid.length === 0) return null;

  const first = Math.min(...valid.map((s) => s.s));
  const last = Math.max(...valid.map((s) => s.e));
  // Round to business-zone hours: shift into the zone, floor/ceil, shift back.
  const startMs = Math.floor((first + zoneOffsetMs) / HOUR) * HOUR - zoneOffsetMs;
  const endMs = Math.ceil((last + zoneOffsetMs) / HOUR) * HOUR - zoneOffsetMs;
  const span = Math.max(HOUR, endMs - startMs);
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - startMs) / span) * 100));

  const totals: Partial<Record<TimelineKind, number>> = {};
  const segments = valid.map((s) => {
    const seconds = Math.round((s.e - s.s) / 1000);
    totals[s.kind] = (totals[s.kind] ?? 0) + seconds;
    return {
      kind: s.kind,
      label: s.label,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      left: pct(s.s),
      width: Math.max(0.4, pct(s.e) - pct(s.s)),
      seconds,
    };
  });

  const markers = skips
    .map((k) => ({ at: k.at, label: k.label, t: ms(k.at) }))
    .filter((k) => Number.isFinite(k.t) && k.t >= startMs && k.t <= endMs)
    .map((k) => ({ at: k.at, label: k.label, left: pct(k.t) }));

  const ticks: { ms: number; left: number }[] = [];
  for (let t = startMs; t <= endMs; t += HOUR) ticks.push({ ms: t, left: pct(t) });

  return { startMs, endMs, segments, markers, ticks, totals };
}

/** Kept here for the reports that import it; it lives with the other zone helpers. */
export { zoneOffsetMs } from "@/lib/time/businessTime";
