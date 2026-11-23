import type {
  CalendarDayCell,
  CalendarMonthGrid,
  CalendarOverride,
  CalendarSource,
  CalendarView,
  SaturdayRule,
  WeekPatternPeriod,
  WorkWeekBody,
  WorkWeekInput,
  WorkWeekView,
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

/** A day set on the calendar for some departments only (3.5, a department holiday). */
export function isForDepartments(o: CalendarOverride | null | undefined): boolean {
  return Boolean(o?.departmentIds?.length);
}

/**
 * `isWorkingDay(org, date) = override?.isWorking ?? weekPattern.includes(isoWeekday(date))`.
 * A day set for some departments only is not the organisation's answer (3.5).
 */
export function isWorkingDay(
  date: string,
  weekPattern: PatternSource,
  overrides: Map<string, CalendarOverride>,
): boolean {
  const o = overrides.get(date);
  return o && !isForDepartments(o)
    ? o.isWorking
    : patternOf(weekPattern, date).includes(isoWeekday(date));
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
        departmentIds: o?.departmentIds?.length ? [...o.departmentIds] : [],
        setWorking: o ? o.isWorking : null,
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
  choice: { isWorking: boolean; label: string; departmentIds?: string[] },
):
  | { kind: "put"; isWorking: boolean; label: string | null; departmentIds: string[] }
  | { kind: "delete" } {
  const label = choice.label.trim();
  const departmentIds = [...new Set(choice.departmentIds ?? [])];
  const patternWorking = weekPattern.includes(isoWeekday(date));
  // A day for some departments only is never "the pattern": their own weeks may differ.
  if (choice.isWorking === patternWorking && !label && !departmentIds.length) {
    return { kind: "delete" };
  }
  return { kind: "put", isWorking: choice.isWorking, label: label || null, departmentIds };
}

/** Toggles one ISO weekday in a pattern, keeping it sorted and never empty. */
export function toggleWeekday(pattern: number[], day: number): number[] {
  const next = pattern.includes(day) ? pattern.filter((d) => d !== day) : [...pattern, day];
  return next.length ? next.sort((a, b) => a - b) : pattern;
}

/** "Sales, Support": the names of the departments a day is for (unknown ids are counted). */
export function departmentsText(ids: string[], names: Map<string, string>): string {
  const known = ids.map((id) => names.get(id)).filter((n): n is string => Boolean(n));
  const missing = ids.length - known.length;
  if (!known.length)
    return ids.length ? `${ids.length} department${ids.length === 1 ? "" : "s"}` : "";
  return missing ? `${known.join(", ")} and ${missing} more` : known.join(", ");
}

// ---- 3.5: Saturday rules and weeks of their own ---------------------------------------

/** The API's labels (calendar.rules.ts `SATURDAY_RULE_LABEL`), the same words as 3.5. */
export const SATURDAY_RULE_LABEL: Record<SaturdayRule, string> = {
  EVERY: "Every Saturday is a working day",
  NONE: "Every Saturday is off",
  OFF_2_4: "2nd and 4th Saturdays off",
  OFF_1_3: "1st and 3rd Saturdays off",
  OFF_1_3_5: "1st, 3rd and 5th Saturdays off",
  ALTERNATE: "Alternate Saturdays (every other week)",
};

export const SATURDAY_RULES = Object.keys(SATURDAY_RULE_LABEL) as SaturdayRule[];

export const SATURDAY_OPTIONS: { value: SaturdayRule; label: string }[] = SATURDAY_RULES.map(
  (value) => ({ value, label: SATURDAY_RULE_LABEL[value] }),
);

export function isSaturdayRule(value: unknown): value is SaturdayRule {
  return typeof value === "string" && (SATURDAY_RULES as string[]).includes(value);
}

/** "Every Saturday is off" after a semicolon: "every Saturday is off" (the weekday keeps its capital). */
export function lowerFirst(text: string): string {
  return text ? text[0].toLowerCase() + text.slice(1) : text;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Which week of the month a Saturday falls in (1 to 5). */
export function saturdayOrdinal(date: string): number {
  return Math.floor((Number(date.slice(8, 10)) - 1) / 7) + 1;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Whether a Saturday is worked under a rule (the API's `saturdayWorked`). */
export function saturdayWorked(rule: SaturdayRule, anchor: string | null, date: string): boolean {
  switch (rule) {
    case "EVERY":
      return true;
    case "NONE":
      return false;
    case "OFF_2_4":
      return ![2, 4].includes(saturdayOrdinal(date));
    case "OFF_1_3":
      return ![1, 3].includes(saturdayOrdinal(date));
    case "OFF_1_3_5":
      return ![1, 3, 5].includes(saturdayOrdinal(date));
    case "ALTERNATE":
      if (!anchor || !DATE_KEY.test(anchor)) return true;
      return Math.abs(Math.round(daysBetween(anchor, date) / 7)) % 2 === 0;
  }
}

/**
 * The organisation's week on each day: the pattern in effect that day, without
 * Saturday on a Saturday its rule takes off (3.5). Feeds `buildYear`.
 */
export function orgPatternSource(
  view: Pick<CalendarView, "weekPattern" | "patternHistory" | "saturdays" | "saturdayAnchor">,
): (date: string) => number[] {
  return (date) => {
    const days = patternOn(date, view.weekPattern, view.patternHistory);
    if (
      isoWeekday(date) === 6 &&
      days.includes(6) &&
      !saturdayWorked(view.saturdays, view.saturdayAnchor, date)
    ) {
      return days.filter((d) => d !== 6);
    }
    return days;
  };
}

/** "Mon to Fri", "Mon, Wed, Fri", "Mon to Fri and Sun": the weekdays other than Saturday. */
export function weekdaysText(days: number[]): string {
  const short = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const set = [...new Set(days.filter((d) => d >= 1 && d <= 7 && d !== 6))].sort((a, b) => a - b);
  if (!set.length) return "No weekdays";
  const runs: number[][] = [];
  for (const d of set) {
    const last = runs[runs.length - 1];
    if (last && d === last[last.length - 1] + 1) last.push(d);
    else runs.push([d]);
  }
  const parts = runs.map((r) =>
    r.length >= 3
      ? `${short[r[0] - 1]} to ${short[r[r.length - 1] - 1]}`
      : r.map((d) => short[d - 1]).join(", "),
  );
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
    : parts[0];
}

/** The Saturday rule that really applies: every Saturday off when the week has no Saturday. */
export function effectiveSaturdays(week: {
  workDays: number[];
  saturdays: SaturdayRule;
}): SaturdayRule {
  return week.workDays.includes(6) ? week.saturdays : "NONE";
}

/** "Mon to Fri; 2nd and 4th Saturdays off": a week with its Saturday rule, in a line. */
export function workWeekText(week: { workDays: number[]; saturdays: SaturdayRule }): string {
  return `${weekdaysText(week.workDays)}; ${lowerFirst(SATURDAY_RULE_LABEL[effectiveSaturdays(week)])}`;
}

/** The form's starting point for a saved week (Saturday folded into the rule). */
export function workWeekInputOf(week: WorkWeekView | null | undefined): WorkWeekInput | null {
  if (!week) return null;
  const saturdays = effectiveSaturdays(week);
  return {
    workDays: week.workDays.filter((d) => d !== 6),
    saturdays,
    ...(saturdays === "ALTERNATE" && week.saturdayAnchor
      ? { saturdayAnchor: week.saturdayAnchor }
      : {}),
  };
}

/**
 * What `PUT /calendar/departments` and `PUT /calendar/people` take. The API works
 * a Saturday only when the week has 6 and the rule allows it, so Saturday joins
 * the week unless the rule is "every Saturday is off"; the anchor goes only with
 * ALTERNATE.
 */
export function workWeekBody(ids: string[], input: WorkWeekInput): WorkWeekBody {
  const weekdays = [
    ...new Set(input.workDays.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7 && d !== 6)),
  ];
  const workDays = (input.saturdays === "NONE" ? weekdays : [...weekdays, 6]).sort((a, b) => a - b);
  return {
    ids: [...new Set(ids)],
    workDays,
    saturdays: input.saturdays,
    ...(input.saturdays === "ALTERNATE" && input.saturdayAnchor
      ? { saturdayAnchor: input.saturdayAnchor }
      : {}),
  };
}

/** What `PUT /calendar/saturdays` takes. */
export function saturdaysBody(
  rule: SaturdayRule,
  anchor?: string | null,
): { saturdays: SaturdayRule; saturdayAnchor?: string } {
  return rule === "ALTERNATE" && anchor
    ? { saturdays: rule, saturdayAnchor: anchor }
    : { saturdays: rule };
}

/** A problem with a Saturday rule before it is sent (ALTERNATE needs a worked Saturday). */
export function saturdayAnchorProblem(
  rule: SaturdayRule,
  anchor: string | null | undefined,
): string | null {
  if (rule !== "ALTERNATE") return null;
  return anchor && DATE_KEY.test(anchor) && isoWeekday(anchor) === 6
    ? null
    : "Pick a Saturday that is worked.";
}

/** The API's words for what decides a person's day (calendar.rules.ts). */
export const CALENDAR_SOURCE_LABEL: Record<CalendarSource, string> = {
  OVERRIDE: "A day set on the organisation calendar",
  PERSON: "Their own calendar",
  DEPARTMENT: "Their department's calendar",
  ORGANISATION: "The organisation's week",
};

export function isCalendarSource(value: unknown): value is CalendarSource {
  return typeof value === "string" && value in CALENDAR_SOURCE_LABEL;
}

/**
 * What decides most of a person's days, as the API's person year says: their own
 * week, else their department's, else the organisation's.
 */
export function personSource(
  who: { id: string; departmentId?: string | null },
  view: Pick<CalendarView, "people" | "departments">,
): { source: Exclude<CalendarSource, "OVERRIDE">; week: WorkWeekView | null } {
  const own = view.people.find((p) => p.id === who.id);
  if (own) return { source: "PERSON", week: own };
  const dept = who.departmentId ? view.departments.find((d) => d.id === who.departmentId) : null;
  if (dept) return { source: "DEPARTMENT", week: dept };
  return { source: "ORGANISATION", week: null };
}

/** The organisation's week in a line: "Mon to Sat; 2nd and 4th Saturdays off". */
export function orgWeekText(view: Pick<CalendarView, "weekPattern" | "saturdays">): string {
  if (!view.weekPattern.includes(6)) return patternText(view.weekPattern);
  return workWeekText({ workDays: view.weekPattern, saturdays: view.saturdays });
}

/** Days of a person's year by what decides them, for the preview's tally. */
export function countBySource(days: { source: CalendarSource }[]): Record<CalendarSource, number> {
  const out: Record<CalendarSource, number> = {
    OVERRIDE: 0,
    PERSON: 0,
    DEPARTMENT: 0,
    ORGANISATION: 0,
  };
  for (const d of days) out[d.source] += 1;
  return out;
}
