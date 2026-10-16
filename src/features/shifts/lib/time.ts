/** "HH:MM" clock-time helpers for shift definitions (24h, business time). */

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHm(value: string): boolean {
  return HM.test(value);
}

/** "09:30" -> 570. Invalid input gives NaN rather than throwing (the editor holds drafts). */
export function hmToMinutes(value: string): number {
  const m = HM.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
}

/** Minutes since midnight -> "HH:MM", wrapping past 24h either way (as the API does). */
export function minutesToHm(total: number): string {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Reads what someone typed into a time field as "HH:MM" (24h), or null when it is
 * not a time. Lenient about the shape so typing is quick: "9:30", "0930", "930",
 * "9", "21.30" and "21h30" all work.
 */
export function normalizeHm(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let hours: number;
  let minutes: number;
  const separated = /^(\d{1,2})\s*[:.h]\s*(\d{1,2})$/i.exec(raw);
  if (separated) {
    if (separated[2].length !== 2) return null;
    hours = Number(separated[1]);
    minutes = Number(separated[2]);
  } else if (/^\d{1,4}$/.test(raw)) {
    if (raw.length <= 2) {
      hours = Number(raw);
      minutes = 0;
    } else {
      hours = Number(raw.slice(0, raw.length - 2));
      minutes = Number(raw.slice(-2));
    }
  } else {
    return null;
  }

  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "09:30", "18:30" -> "09:30–18:30". */
export function formatHmRange(from: string, to: string): string {
  return `${from}–${to}`;
}

/** Shift length in minutes; an end at or before the start runs past midnight. */
export function shiftLengthMinutes(start: string, end: string): number {
  const s = hmToMinutes(start);
  const e = hmToMinutes(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return Number.NaN;
  return e > s ? e - s : e + 1440 - s;
}

/** "9 h", "8 h 30 min", for a length in minutes. */
export function formatLength(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** True when the shift's end is not after its start, so it ends the next day. */
export function isOvernight(start: string, end: string): boolean {
  const s = hmToMinutes(start);
  const e = hmToMinutes(end);
  return !Number.isNaN(s) && !Number.isNaN(e) && e <= s;
}
