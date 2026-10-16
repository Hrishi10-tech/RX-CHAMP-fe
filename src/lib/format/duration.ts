/**
 * Durations and signed amounts the way RX Vision writes them: "6h 24m", "45m",
 * "−20m". The copy rules ask for a true minus sign (U+2212), never a hyphen, so
 * a negative never reads as a dash or a range.
 */

/** U+2212 MINUS SIGN. */
export const MINUS = "−";

/** A finite number, or 0 for null, undefined, NaN and the infinities. */
function finite(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Whole minutes in `sec`, ignoring the sign, to the nearest minute (half a
 * minute rounds up). The API rounds the same way in its own copy ("+15 min if
 * approved" for a 14m 50s overrun), so the two never disagree by a minute.
 */
function wholeMinutes(sec: number): number {
  return Math.round(Math.abs(sec) / 60);
}

/** `sec` in whole minutes, to the nearest minute, keeping the sign. */
export function roundMinutes(sec: number | null | undefined): number {
  const value = finite(sec);
  const minutes = wholeMinutes(value);
  return minutes === 0 ? 0 : value < 0 ? -minutes : minutes;
}

/**
 * Under any table that shows rows and a total. Payroll totals come from the exact
 * seconds, rounded once, so they agree with every other view, the Excel file and
 * the month's lock; each row is rounded on its own, so the rows can add up to a
 * minute or two away from the total.
 */
export const ROUNDING_NOTE = "Rows are rounded to the minute; totals are exact.";

const hoursFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** "6h 04m", "45m", "0m" for a count of whole minutes (never negative). */
function minutesText(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${hoursFormat.format(h)}h ${String(m).padStart(2, "0")}m`;
}

/**
 * A duration in seconds as "6h 24m" (minutes zero-padded: "6h 04m"), "45m" under
 * an hour, "0m" for nothing. Rounds to the nearest minute. A negative value gets
 * a minus sign ("−20m"); under half a minute either way is "0m". Bad input reads
 * as "0m", never "NaNh".
 */
export function formatDuration(sec: number | null | undefined): string {
  const value = finite(sec);
  const minutes = wholeMinutes(value);
  if (minutes === 0) return "0m";
  return `${value < 0 ? MINUS : ""}${minutesText(minutes)}`;
}

/** A change to focus time: "+20m", "−1h 05m", or "0m" when there is none. */
export function formatSignedDuration(sec: number | null | undefined): string {
  const value = finite(sec);
  const minutes = wholeMinutes(value);
  if (minutes === 0) return "0m";
  return `${value < 0 ? MINUS : "+"}${minutesText(minutes)}`;
}

/** Whole minutes with a sign, for effect copy: "+15 min", "−15 min", "0 min". */
export function formatSignedMinutes(min: number | null | undefined): string {
  const value = Math.round(finite(min));
  if (value === 0) return "0 min";
  return `${value < 0 ? MINUS : "+"}${Math.abs(value)} min`;
}

/**
 * An amount of focus time that could change, from seconds: "+15 min" under an
 * hour, "+1h 30m" from there, with a true minus sign for negatives.
 */
export function formatSignedAmount(sec: number | null | undefined): string {
  const value = finite(sec);
  const minutes = wholeMinutes(value);
  if (minutes === 0) return "0 min";
  const sign = value < 0 ? MINUS : "+";
  return minutes < 60 ? `${sign}${minutes} min` : `${sign}${minutesText(minutes)}`;
}

/** Minutes as "15 min" under an hour and "1h 05m" from there. */
export function formatMinutesShort(min: number | null | undefined): string {
  const value = Math.max(0, Math.round(finite(min)));
  return value < 60 ? `${value} min` : minutesText(value);
}

/**
 * Turns a hyphen used as a minus before a number into the true minus sign:
 * "-15 min if rejected" becomes "−15 min if rejected". Only a hyphen at the
 * start or after a space or bracket counts, so words ("auto-skipped") and
 * ranges ("09:30-18:30") are left alone.
 */
export function withMinusSign(text: string): string {
  return text.replace(/(^|[\s(])-(?=\d)/g, `$1${MINUS}`);
}

/** A whole-number percentage, "0%" for bad input. */
export function formatPercent(part: number, whole: number): string {
  const p = finite(part);
  const w = finite(whole);
  if (w <= 0) return "0%";
  return `${Math.round((p / w) * 100)}%`;
}
