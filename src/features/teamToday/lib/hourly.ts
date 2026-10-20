import { dateKeyOf } from "@/lib/time/businessTime";
import { businessHourOf as hourOfInstant, formatHour12 } from "@/lib/time/format";
import type { HourActivity } from "@/features/activity/types/hourly";

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Exactly 24 hours, 0..23, whatever the server sent: missing hours are filled
 * with zeros, duplicates and out-of-range hours are dropped, values are made
 * non-negative numbers.
 */
export function normalizeHours(hours: HourActivity[] | null | undefined): HourActivity[] {
  const byHour = new Map<number, HourActivity>();
  for (const h of Array.isArray(hours) ? hours : []) {
    const hour = typeof h?.hour === "number" ? Math.floor(h.hour) : -1;
    if (hour < 0 || hour > 23 || byHour.has(hour)) continue;
    byHour.set(hour, {
      hour,
      activeMin: Math.min(60, num(h.activeMin)),
      availableMin: Math.min(60, num(h.availableMin)),
      breakMin: Math.min(60, num(h.breakMin)),
      meetingMin: Math.min(60, num(h.meetingMin)),
      quiet: Boolean(h.quiet),
    });
  }
  return Array.from(
    { length: 24 },
    (_, hour) =>
      byHour.get(hour) ?? {
        hour,
        activeMin: 0,
        availableMin: 0,
        breakMin: 0,
        meetingMin: 0,
        quiet: false,
      },
  );
}

/** An hour that sits inside the person's work span (working, on a break or in a meeting). */
function inDay(h: HourActivity): boolean {
  return h.availableMin + h.breakMin + h.meetingMin > 0 || h.activeMin > 0;
}

/** A run of hours around the clock: `start` can be later than `end` when it crosses midnight. */
export interface HourSpan {
  start: number;
  end: number;
}

/** When the day's work began and ended (business time), as the API reports them. */
export interface WorkBounds {
  startedAt?: string | null;
  /** Null while the day runs: pass "now" for a day still open. */
  endedAt?: string | null;
}

/** The business-time hour (0..23) of an instant. */
export function businessHourOf(at: Date): number {
  return hourOfInstant(at);
}

/**
 * Whether the day's work really ran past midnight: it began on one calendar day
 * (business time) and ended, or is still running, on a later one. A night shift
 * (18:30 to 03:30) does; a split day (06:00 to 07:30, then 19:00 to 21:30) does not.
 */
export function crossesMidnight(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
): boolean {
  if (!startedAt || !endedAt) return false;
  const from = new Date(startedAt);
  const to = new Date(endedAt);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return false;
  return dateKeyOf(from) !== dateKeyOf(to);
}

/**
 * The span of a set of busy hours read around the clock: everything outside the
 * longest run of empty hours ({ start: 18, end: 3 } for a run of night shifts).
 * Only for work known to cross midnight (see `crossesMidnight`): any other day's
 * span never wraps. On a tie, the run of empty hours that holds midnight wins.
 * Null when nothing is busy.
 */
export function spanOf(busy: readonly boolean[]): HourSpan | null {
  const at = (h: number) => Boolean(busy[((h % 24) + 24) % 24]);
  let count = 0;
  for (let h = 0; h < 24; h++) if (at(h)) count++;
  if (count === 0) return null;
  if (count === 24) return { start: 0, end: 23 };

  let best: { from: number; length: number; holdsMidnight: boolean } | null = null;
  for (let from = 0; from < 24; from++) {
    // Only where a run of empty hours begins.
    if (at(from) || !at(from + 23)) continue;
    let length = 0;
    while (!at(from + length)) length++;
    const holdsMidnight = from === 0 || from + length >= 24;
    if (
      !best ||
      length > best.length ||
      (length === best.length && holdsMidnight && !best.holdsMidnight)
    ) {
      best = { from, length, holdsMidnight };
    }
  }
  // `count` < 24, so there is at least one empty run.
  const gap = best as { from: number; length: number };
  return { start: (gap.from + gap.length) % 24, end: (gap.from + 23) % 24 };
}

/** Whether `hour` falls inside `span`, around the clock. */
export function inSpan(span: HourSpan | null, hour: number): boolean {
  if (!span) return false;
  return span.start <= span.end
    ? hour >= span.start && hour <= span.end
    : hour >= span.start || hour <= span.end;
}

/** The hours of `span` in the order they happened: 18, 19, … 23, 0, 1, 2, 3. */
export function spanHours(span: HourSpan | null): number[] {
  if (!span) return [];
  const out: number[] = [];
  for (let h = span.start; ; h = (h + 1) % 24) {
    out.push(h);
    if (h === span.end || out.length === 24) break;
  }
  return out;
}

/**
 * All 24 hours in the order to draw them. A span that stays within the
 * calendar day keeps 00 to 23, with the span highlighted. One that crosses
 * midnight starts at the last 6-hour mark before it begins (12 for a shift from
 * 18:30), so it is drawn in one piece with its night hours after 23.
 */
export function hourOrder(span: HourSpan | null): number[] {
  let first = 0;
  if (span && span.start > span.end) {
    // The 6-hour mark before the first hour, if it falls in the gap; else the first hour.
    const mark = Math.floor((span.start - 1) / 6) * 6;
    first = mark > span.end ? mark : span.start;
  }
  return Array.from({ length: 24 }, (_, i) => (first + i) % 24);
}

/**
 * The work span of one day. Work that crosses midnight runs from the hour it
 * started, through midnight, to the hour it ended ({ start: 18, end: 3 }). Any
 * other day runs from its first to its last busy hour and never wraps, however
 * long the gaps in it: 06 to 07 and 19 to 21 is { start: 6, end: 21 }. Null for
 * a day with nothing in it.
 */
export function workSpan(hours: HourActivity[], bounds?: WorkBounds | null): HourSpan | null {
  if (bounds && crossesMidnight(bounds.startedAt, bounds.endedAt)) {
    const start = businessHourOf(new Date(bounds.startedAt as string));
    // A day that ends on the hour (03:00) has nothing in that hour.
    const end = businessHourOf(new Date(Date.parse(bounds.endedAt as string) - 1000));
    // More than a whole day: the whole clock.
    return end < start ? { start, end } : { start: 0, end: 23 };
  }
  let first = -1;
  let last = -1;
  for (const h of hours) {
    if (h.hour < 0 || h.hour > 23 || !inDay(h)) continue;
    if (first < 0 || h.hour < first) first = h.hour;
    if (h.hour > last) last = h.hour;
  }
  return first < 0 ? null : { start: first, end: last };
}

/** "9 AM", "12 PM": an hour as people read it (SPEC 2.10). */
export function hourLabel(hour: number): string {
  return formatHour12(hour);
}

/** Bar height in px for active minutes out of 60, at least 2 px so a zero still shows. */
export function barHeight(activeMin: number, maxPx: number): number {
  const ratio = Math.min(1, num(activeMin) / 60);
  return Math.max(2, Math.round(ratio * maxPx));
}

/**
 * What a screen reader hears for the strip: the span, the minutes in each hour,
 * and the quiet hours. "No work today" before Start Day.
 */
export function hourlyLabel(name: string, hours: HourActivity[], span: HourSpan | null): string {
  if (!span) return `${name}: no activity recorded.`;
  const byHour = new Map(hours.map((h) => [h.hour, h]));
  const shown = spanHours(span)
    .map((hour) => byHour.get(hour))
    .filter((h): h is HourActivity => Boolean(h));
  const minutes = shown.map((h) => `${hourLabel(h.hour)} ${Math.round(h.activeMin)} min`);
  const quiet = shown.filter((h) => h.quiet).map((h) => hourLabel(h.hour));
  return (
    `${name}, keyboard and mouse minutes by hour from ${hourLabel(span.start)} to ` +
    `${hourLabel((span.end + 1) % 24)}: ${minutes.join(", ")}.` +
    (quiet.length ? ` Quiet ${quiet.length === 1 ? "hour" : "hours"}: ${quiet.join(", ")}.` : "")
  );
}
