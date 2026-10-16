/**
 * Month keys ("YYYY-MM") and the calendar arithmetic around them. Like the day
 * keys in businessTime, these are plain calendar values in the business zone:
 * no instant and no browser time zone is involved.
 */

const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

/** Monday-first weekday names, as the calendars show them. */
export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isMonthKey(value: string | null | undefined): value is string {
  if (!value) return false;
  const m = MONTH_KEY.exec(value);
  return Boolean(m && Number(m[2]) >= 1 && Number(m[2]) <= 12);
}

export function isDateKey(value: string | null | undefined): value is string {
  if (!value) return false;
  const m = DATE_KEY.exec(value);
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(`${m[1]}-${m[2]}`);
}

/** "2026-10-13" -> "2026-10". */
export function monthOfDate(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function parts(month: string): [number, number] {
  const m = MONTH_KEY.exec(month);
  return m ? [Number(m[1]), Number(m[2])] : [1970, 1];
}

/** Adds whole months to a month key: addMonths("2026-01", -1) is "2025-12". */
export function addMonths(month: string, n: number): string {
  const [y, m] = parts(month);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const mon = (total % 12) + 1;
  return `${year}-${String(mon).padStart(2, "0")}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = parts(month);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "2026-09" -> "September 2026". */
export function formatMonth(month: string | null | undefined): string {
  if (!isMonthKey(month)) return month ?? "";
  const [y, m] = parts(month);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** "2026-09" -> "Sep 2026". */
export function formatMonthShort(month: string | null | undefined): string {
  if (!isMonthKey(month)) return month ?? "";
  const [y, m] = parts(month);
  return `${MONTH_SHORT[m - 1]} ${y}`;
}

/** ISO weekday of a day key, 1 = Monday ... 7 = Sunday. */
export function isoWeekday(dateKey: string): number {
  const m = DATE_KEY.exec(dateKey);
  if (!m) return 1;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Every day key of a month, in order. */
export function daysOf(month: string): string[] {
  const n = daysInMonth(month);
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/**
 * A Monday-first month grid: null for the blank cells before the 1st and after
 * the last day, so every row has seven cells.
 */
export function calendarCells(month: string): (string | null)[] {
  const days = daysOf(month);
  const lead = isoWeekday(days[0]) - 1;
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** "13 Oct 2026" for a day key. */
export function formatDayLong(dateKey: string | null | undefined): string {
  if (!dateKey) return "";
  const m = DATE_KEY.exec(dateKey);
  if (!m) return dateKey;
  return `${Number(m[3])} ${MONTH_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}
