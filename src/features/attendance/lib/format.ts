import { dateKeyOf, formatDay } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import type { PunchSource } from "@/features/attendance/types";

/** "13 Oct 9:02 AM" in the business time zone (4.0: the 12 hour clock). */
export function dayTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDay(dateKeyOf(d))} ${formatTime12(d)}`;
}

/** "3 min ago", "2 hours ago", then "13 Oct 6:40 PM", for last-seen columns. */
export function sinceText(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const min = Math.max(0, Math.round((now - t) / 60_000));
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  return dayTime(iso);
}

export const PUNCH_SOURCE_LABEL: Record<PunchSource, string> = {
  PUSH: "Pushed",
  PULL: "Pulled",
  CSV: "CSV import",
  MANUAL: "By hand",
};

export const CODE_RE = /^[A-Za-z0-9 ]{1,64}$/;

/** Splits a CSV into parts of at most `rows` punches, each with the header row. */
export function csvParts(text: string, rows = 2000): string[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length);
  if (lines.length < 2) return lines.length ? [lines.join("\n")] : [];
  const [header, ...body] = lines;
  const out: string[] = [];
  for (let i = 0; i < body.length; i += rows)
    out.push([header, ...body.slice(i, i + rows)].join("\n"));
  return out;
}

/** "YYYY-MM-DD HH:MM" of a datetime-local value, as the API's punch-by-hand wants it. */
export function localPunchTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

/** A datetime-local value read back on the 12 hour clock: "4 Nov 6:05 PM", or "". */
export function localPunchText(value: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2})/.exec(value);
  if (!m) return "";
  const time = formatTime12(m[2]);
  return time ? `${formatDay(m[1])} ${time}` : "";
}

/** What the Attendance page offers a role (4.0: the API's READERS and CHANGERS). */
export interface AttendanceAccess {
  /**
   * The organisation's admin, or a Super Admin acting in it: who checks in how, keys,
   * the pull, CSV import, settings.
   */
  canEdit: boolean;
  /** Add or void a punch by hand: the admins and the Super Manager. */
  canWrite: boolean;
}

export function attendanceAccess(role: string | null | undefined): AttendanceAccess {
  const canEdit = role === "SUPER_ADMIN" || role === "ADMIN";
  return { canEdit, canWrite: canEdit || role === "SUPER_MANAGER" };
}
