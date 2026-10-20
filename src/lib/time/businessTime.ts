/**
 * Business-time helpers. The API keeps every "HH:MM" and "YYYY-MM-DD" in one
 * business time zone (Asia/Kolkata unless the deployment says otherwise), and
 * every instant in UTC. A manager reading the portal from another zone must still
 * see "started 11:12" the way the staff member's agent saw it, so instants are
 * formatted in the business zone, never in the browser's.
 */
export const BUSINESS_TIMEZONE = process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE || "Asia/Kolkata";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const keyFormatters = new Map<string, Intl.DateTimeFormat>();
const hmFormatters = new Map<string, Intl.DateTimeFormat>();

function keyFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = keyFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    keyFormatters.set(timeZone, f);
  }
  return f;
}

function hmFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = hmFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    hmFormatters.set(timeZone, f);
  }
  return f;
}

/** "YYYY-MM-DD" of `date` in the business zone. */
export function dateKeyOf(date: Date, timeZone = BUSINESS_TIMEZONE): string {
  return keyFormatter(timeZone).format(date);
}

/** Today's "YYYY-MM-DD" in the business zone. */
export function todayKey(now: Date = new Date(), timeZone = BUSINESS_TIMEZONE): string {
  return dateKeyOf(now, timeZone);
}

/** Adds whole days to a "YYYY-MM-DD" key (calendar arithmetic, no zone involved). */
export function addDaysToKey(key: string, days: number): string {
  const m = DATE_KEY.exec(key);
  if (!m) return key;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}

/**
 * ISO instant -> "HH:MM" (24h) in the business zone, or "" when missing/invalid.
 * A wire value for comparisons and inputs, never for display: people read times
 * through formatTime12 (lib/time/format), which the lint rules enforce.
 */
export function hmOf(iso: string | null | undefined, timeZone = BUSINESS_TIMEZONE): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return hmFormatter(timeZone).format(d);
}

/** "2026-10-13" -> "13 Oct". Unknown input comes back unchanged. */
export function formatDay(key: string | null | undefined): string {
  if (!key) return "";
  const m = DATE_KEY.exec(key);
  if (!m) return key;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return key;
  return `${Number(m[3])} ${MONTHS[month - 1]}`;
}

/** "2026-10-13" -> "Tue 13 Oct". */
export function formatDayWithWeekday(key: string | null | undefined): string {
  if (!key) return "";
  const m = DATE_KEY.exec(key);
  if (!m) return key;
  const weekday = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return `${WEEKDAYS[weekday]} ${formatDay(key)}`;
}

/** "Today", "Yesterday", or "13 Oct", relative to the business day. */
export function relativeDay(key: string, today: string = todayKey()): string {
  if (key === today) return "Today";
  if (key === addDaysToKey(today, -1)) return "Yesterday";
  if (key === addDaysToKey(today, 1)) return "Tomorrow";
  return formatDay(key);
}

/**
 * A duration in whole minutes, for break lengths: "under 1 min", "19 min",
 * "1 h 5 min". Rounds to the nearest minute, as the API does in its own copy
 * ("+15 min if approved" for a 14m 50s overrun). A break's length is whole
 * minutes, so "Took 30 min of 15" still always sits next to "15 min over".
 */
export function formatMinutes(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "0 min";
  const minutes = Math.round(totalSec / 60);
  if (minutes === 0) return totalSec === 0 ? "0 min" : "under 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** The business zone's offset from UTC at an instant, in ms (IST: +5h30). */
export function zoneOffsetMs(instant: number, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
    return asUtc - Math.floor(instant / 1000) * 1000;
  } catch {
    return 0;
  }
}
