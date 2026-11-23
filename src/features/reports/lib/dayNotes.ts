import type { PersonDaySummary } from "@/features/reports/types";

/** "Holiday: Diwali", "Holiday", "Weekly day off", or null on a working day (3.2). */
export function dayOffText(d: Pick<PersonDaySummary, "dayOff">): string | null {
  if (!d.dayOff) return null;
  if (d.dayOff.kind === "HOLIDAY")
    return d.dayOff.name?.trim() ? `Holiday: ${d.dayOff.name.trim()}` : "Holiday";
  return "Weekly day off";
}

/** "Holiday: Diwali" or "Holiday" on a holiday, else null (day lists already say "Day off"). */
export function holidayText(d: Pick<PersonDaySummary, "dayOff">): string | null {
  return d.dayOff?.kind === "HOLIDAY" ? dayOffText(d) : null;
}

/**
 * "CL/SL leave: half day (first half)", "EL/PL leave, full day", or "Leave asked
 * for, waiting" (3.4); null on a day without leave.
 */
export function leaveText(d: Pick<PersonDaySummary, "leave">): string | null {
  const l = d.leave;
  if (!l) return null;
  if (l.days > 0) {
    const what = l.full ? "full day" : l.label.charAt(0).toLowerCase() + l.label.slice(1);
    return `${l.categories || "Leave"} leave, ${what}${l.pendingDays > 0 ? " (more waiting)" : ""}`;
  }
  return l.pendingDays > 0 ? "Leave asked for, waiting for a decision" : null;
}

/** Minutes late, or 0. */
export function lateMinutes(d: Pick<PersonDaySummary, "lateStart">): number {
  return d.lateStart && d.lateStart.minutes > 0 ? d.lateStart.minutes : 0;
}

/** The reason given for a late start, trimmed; null when none was given. */
export function lateReason(d: Pick<PersonDaySummary, "lateStart">): string | null {
  const r = d.lateStart?.reason?.trim();
  return r ? r : null;
}

/** "12 min late: Traffic on the bridge" or "12 min late, no reason given". */
export function lateText(d: Pick<PersonDaySummary, "lateStart">): string | null {
  const min = lateMinutes(d);
  if (!min) return null;
  const reason = lateReason(d);
  return reason ? `${min} min late: ${reason}` : `${min} min late, no reason given`;
}

export interface InputShare {
  activeSec: number;
  idleSec: number;
  noDataSec: number;
  availableSec: number;
  activePct: number;
  idlePct: number;
  noDataPct: number;
}

/**
 * Active, idle and no-data shares of the available time (3.2, fix 10). The
 * three are rounded so they add up to 100 (largest remainder); any time the
 * three do not cover counts as no data.
 */
export function inputShare(
  input:
    | {
        activeSec: number;
        idleSec: number;
        noDataSec: number;
        availableSec: number;
      }
    | null
    | undefined,
): InputShare | null {
  if (!input) return null;
  const active = Math.max(0, input.activeSec);
  const idle = Math.max(0, input.idleSec);
  const total = Math.max(input.availableSec, active + idle + Math.max(0, input.noDataSec));
  // Whatever the three do not cover is time the agent did not report.
  const noData = Math.max(0, total - active - idle);
  if (total <= 0) return null;
  const raw = [active, idle, noData].map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, rest: v - Math.floor(v) })).sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (left <= 0) break;
    if (raw[i] > 0) {
      floors[i] += 1;
      left -= 1;
    }
  }
  return {
    activeSec: active,
    idleSec: idle,
    noDataSec: noData,
    availableSec: total,
    activePct: floors[0],
    idlePct: floors[1],
    noDataPct: floors[2],
  };
}
