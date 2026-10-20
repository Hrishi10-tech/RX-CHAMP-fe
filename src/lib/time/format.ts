/**
 * The one way the portal writes a time of day (SPEC 2.10, 7.4): `h:mm AM/PM` in
 * the business time zone ("9:05 AM", "12:30 PM"). Wire formats stay ISO for
 * instants and "HH:MM" (24-hour) for shift definitions; both come through here
 * for display, so no 24-hour time reaches a screen, a PDF or a tooltip.
 */
import { BUSINESS_TIMEZONE } from "@/lib/time/businessTime";

const HM = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

const partFormatters = new Map<string, Intl.DateTimeFormat>();

/** Hour (0-23) and minute of an instant in `timeZone`. Not for display on its own. */
function clockParts(date: Date, timeZone: string): { hour: number; minute: number } {
  let f = partFormatters.get(timeZone);
  if (!f) {
    // Numbers only: the 12-hour text is built below, so every engine (and every
    // ICU version, some of which put a narrow no-break space before "AM") agrees.
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    partFormatters.set(timeZone, f);
  }
  let hour = 0;
  let minute = 0;
  for (const part of f.formatToParts(date)) {
    if (part.type === "hour") hour = Number(part.value) % 24;
    if (part.type === "minute") minute = Number(part.value);
  }
  return { hour, minute };
}

/** 13, 5 -> "1:05 PM"; 0, 0 -> "12:00 AM". */
export function twelveHour(hour: number, minute: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  const m = ((Math.floor(minute) % 60) + 60) % 60;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "9 AM", "12 PM": an hour on a chart axis. */
export function formatHour12(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A time of day for people to read:
 * - an ISO instant (or a Date, or epoch ms) in the business zone,
 * - a "HH:MM" clock time (a shift definition) as it is.
 * Missing or unreadable input gives "".
 */
export function formatTime12(
  value: string | number | Date | null | undefined,
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") {
    const hm = HM.exec(value.trim());
    if (hm) {
      const hour = Number(hm[1]);
      const minute = Number(hm[2]);
      if (hour > 24 || minute > 59) return "";
      return twelveHour(hour, minute);
    }
  }
  const date = toDate(value);
  if (!date) return "";
  const { hour, minute } = clockParts(date, timeZone);
  return twelveHour(hour, minute);
}

/** "9:30 AM – 6:30 PM" for two times in any form formatTime12 reads. */
export function formatTimeRange12(
  from: string | number | Date | null | undefined,
  to: string | number | Date | null | undefined,
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  const a = formatTime12(from, timeZone);
  const b = formatTime12(to, timeZone);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

/** "9 AM" on the hour, "9:30 AM" otherwise: a compact axis or tick label. */
export function formatTimeCompact12(
  value: string | number | Date | null | undefined,
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  return formatTime12(value, timeZone).replace(/:00 /, " ");
}

/** The business-zone hour (0-23) of an instant, for bucketing; NaN when unreadable. */
export function businessHourOf(
  value: string | number | Date | null | undefined,
  timeZone: string = BUSINESS_TIMEZONE,
): number {
  if (value === null || value === undefined || value === "") return Number.NaN;
  const date = toDate(value);
  return date ? clockParts(date, timeZone).hour : Number.NaN;
}
