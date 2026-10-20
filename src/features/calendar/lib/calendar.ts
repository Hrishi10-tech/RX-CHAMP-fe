import type {
  CalendarDayCell,
  CalendarMonthGrid,
  CalendarOverride,
  WeekPatternPeriod,
} from "@/features/calendar/types";

/** SPEC 2.6: Monday to Saturday unless the organisation says otherwise. */
export const DEFAULT_WEEK_PATTERN = [1, 2, 3, 4, 5, 6];

export const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a "YYYY-MM-DD" key. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** A pattern for every day, or the pattern in effect on each day. */
export type PatternSource = number[] | ((date: string) => number[]);

function patternOf(source: PatternSource, date: string): number[] {
  return typeof source === "function" ? source(date) : source;
}

/**
 * The working week in effect on `date`: the latest period that started on or
 * before it. Before the first period (or with no history) the current pattern.
 */
export function patternOn(date: string, current: number[], history: WeekPatternPeriod[]): number[] {
  let found: number[] | null = null;
  for (const p of history) {
    if (p.from <= date) found = p.days;
    else break;
  }
  return found ?? (history.length && date < history[0].from ? history[0].days : current);
}

/**
 * A period with no start: the API dates the organisation's first working week
 * "0000-01-01" (it has always applied), and that date is never shown.
 */
export function isSinceAlways(from: string): boolean {
  return from < "1900-01-01";
}

/** When the current pattern took effect, or null without a history or when it always has. */
export function currentPatternFrom(history: WeekPatternPeriod[], today: string): string | null {
  const started = history.filter((p) => p.from <= today);
  const from = started.length ? started[started.length - 1].from : null;
  return from && !isSinceAlways(from) ? from : null;
}

/**
 * What to say when saving a working week is refused because a month from its
 * first day on is locked for payroll (409 MONTH_LOCKED, `details.month`).
 */
export function weekLockedText(
  month: string | null | undefined,
  monthName: (m: string) => string,
): string {
  const name = month && /^\d{4}-\d{2}$/.test(month) ? monthName(month) : "A month from that day";
  return `${name} is locked for payroll, so its working days can't change. Pick a day after it, or unlock it in Reports first.`;
}

/** Periods that ended before today, newest first, each with its last day. */
export function pastPatterns(
  history: WeekPatternPeriod[],
  today: string,
): (WeekPatternPeriod & { until: string })[] {
  const out: (WeekPatternPeriod & { until: string })[] = [];
  for (let i = 0; i < history.length - 1; i++) {
    const next = history[i + 1];
    if (next.from > today) continue;
    out.push({ ...history[i], until: addDaysKey(next.from, -1) });
  }
  return out.reverse();
}

/** A pattern change set to start after today, if any. */
export function upcomingPattern(
  history: WeekPatternPeriod[],
  today: string,
): WeekPatternPeriod | null {
  return history.find((p) => p.from > today) ?? null;
}

function addDaysKey(date: string, by: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + by));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** "Mon to Sat", "Mon, Wed, Fri": a working week for people to read. */
export function patternText(days: number[]): string {
  const short = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sorted = [...days].sort((a, b) => a - b);
  if (!sorted.length) return "No working days";
  const run = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (run && sorted.length > 2)
    return `${short[sorted[0] - 1]} to ${short[sorted[sorted.length - 1] - 1]}`;
  return sorted.map((d) => short[d - 1]).join(", ");
}

/** `isWorkingDay(org, date) = override?.isWorking ?? weekPattern.includes(isoWeekday(date))`. */
export function isWorkingDay(
  date: string,
  weekPattern: PatternSource,
  overrides: Map<string, CalendarOverride>,
): boolean {
  const o = overrides.get(date);
  return o ? o.isWorking : patternOf(weekPattern, date).includes(isoWeekday(date));
}

export function overrideMap(overrides: CalendarOverride[]): Map<string, CalendarOverride> {
  return new Map(overrides.map((o) => [o.date, o]));
}

/** The twelve months of `year`, laid out Monday-first, with working-day counts. */
export function buildYear(
  year: number,
  weekPattern: PatternSource,
  overrides: CalendarOverride[],
  today = "",
): CalendarMonthGrid[] {
  const map = overrideMap(overrides);
  const months: CalendarMonthGrid[] = [];
  for (let m = 1; m <= 12; m++) {
    const total = daysInMonth(year, m);
    const cells: (CalendarDayCell | null)[] = [];
    const first = isoWeekday(`${year}-${pad(m)}-01`);
    for (let i = 1; i < first; i++) cells.push(null);
    let workingDays = 0;
    for (let d = 1; d <= total; d++) {
      const date = `${year}-${pad(m)}-${pad(d)}`;
      const o = map.get(date);
      const working = isWorkingDay(date, weekPattern, map);
      if (working) workingDays += 1;
      cells.push({
        date,
        day: d,
        weekday: isoWeekday(date),
        isWorking: working,
        label: o?.label ?? null,
        overridden: Boolean(o),
        isToday: date === today,
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (CalendarDayCell | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    months.push({ month: `${year}-${pad(m)}`, weeks, workingDays });
  }
  return months;
}

/** Non-working days with a name in the year, oldest first: the holidays list. */
export function holidaysOf(overrides: CalendarOverride[], year: number): CalendarOverride[] {
  return overrides
    .filter((o) => !o.isWorking && o.date.startsWith(`${year}-`))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * What saving a day should send, given what the person chose. Choosing exactly
 * what the week pattern says, with no label, removes the override instead
 * (SPEC 5.5 `DELETE /calendar/days/:date` goes "back to the pattern").
 */
export function dayChange(
  date: string,
  weekPattern: number[],
  choice: { isWorking: boolean; label: string },
): { kind: "put"; isWorking: boolean; label: string | null } | { kind: "delete" } {
  const label = choice.label.trim();
  const patternWorking = weekPattern.includes(isoWeekday(date));
  if (choice.isWorking === patternWorking && !label) return { kind: "delete" };
  return { kind: "put", isWorking: choice.isWorking, label: label || null };
}

/** Toggles one ISO weekday in a pattern, keeping it sorted and never empty. */
export function toggleWeekday(pattern: number[], day: number): number[] {
  const next = pattern.includes(day) ? pattern.filter((d) => d !== day) : [...pattern, day];
  return next.length ? next.sort((a, b) => a - b) : pattern;
}
