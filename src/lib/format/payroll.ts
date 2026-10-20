import { formatDuration, roundMinutes } from "@/lib/format/duration";

/**
 * The two 4.0 figures shown beside focus time everywhere (SPEC 2.4):
 *
 *  - Paid time (`paidSec`) = focus time + paid break time: the payroll figure.
 *  - Offline, no activity data (`unverifiedSec`): time inside a work session that
 *    the desktop app recorded offline without any activity data. It is left out of
 *    focus (and of paid time) and shown only when there is some.
 */
export const PAID_TIME_LABEL = "Paid time";
export const OFFLINE_LABEL = "Offline, no activity data";

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Paid time as the server sends it; from a server (or a month locked before 4.0)
 * that leaves it out, focus time plus paid breaks, the way the server works it out.
 */
export function paidSecOf(x: {
  paidSec?: unknown;
  focusSec?: unknown;
  paidBreakSec?: unknown;
}): number {
  const sent = finite(x.paidSec);
  if (sent !== null) return Math.max(0, sent);
  return Math.max(0, (finite(x.focusSec) ?? 0) + (finite(x.paidBreakSec) ?? 0));
}

/** Whether there is offline time worth showing: at least a minute once rounded, never "0m". */
export function hasOfflineTime(sec: number | null | undefined): boolean {
  return typeof sec === "number" && sec > 0 && roundMinutes(sec) > 0;
}

/** "25m offline, no activity data", or null when there is none to show. */
export function offlineText(sec: number | null | undefined): string | null {
  return hasOfflineTime(sec) ? `${formatDuration(sec)} offline, no activity data` : null;
}
