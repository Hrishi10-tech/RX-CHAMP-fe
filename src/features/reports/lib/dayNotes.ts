import { formatMinutesShort } from "@/lib/format/duration";
import type { MeetingRecordView } from "@/features/meetings/types";
import type { PersonDaySummary } from "@/features/reports/types";

/**
 * What a day's meetings count as. A meeting can be rejected unless it was marked In a meeting,
 * which needs no approval and always counts (3.6).
 */
export function meetingsCountNote(meetings: Pick<MeetingRecordView, "kind">[]): string {
  const marked = meetings.filter((m) => m.kind === "STATUS").length;
  if (!marked) return "counted as focus time unless rejected";
  if (marked === meetings.length) return "counted as focus time, no approval needed";
  return "counted as focus time unless rejected; time marked In a meeting always counts";
}

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

/** "From home, full day (9h 00m counted)", "From home, half day"; null without any (3.5). */
export function wfhText(
  d: Pick<PersonDaySummary, "wfhDays" | "wfhSec" | "wfhOverSec">,
): string | null {
  if (!d.wfhDays) return null;
  const what =
    d.wfhDays >= 1
      ? d.wfhDays === 1
        ? "full day"
        : `${d.wfhDays} days`
      : d.wfhDays === 0.5
        ? "half day"
        : d.wfhDays === 0.25
          ? "quarter day"
          : `${d.wfhDays} day`;
  const over = d.wfhOverSec
    ? `, ${Math.round(d.wfhOverSec / 60)} min over the cap not counted`
    : "";
  return `From home, ${what}${over}`;
}

/** "Comp off earned: 1 day" (3.5); null when none. */
export function compOffEarnedText(d: Pick<PersonDaySummary, "compOffEarnedDays">): string | null {
  if (!d.compOffEarnedDays) return null;
  return `Comp off earned: ${d.compOffEarnedDays} ${d.compOffEarnedDays === 1 || d.compOffEarnedDays < 1 ? "day" : "days"}`;
}

const STATUS_SOURCE: Record<string, string> = {
  BUTTON: "Started with the button",
  SUGGESTION: "Started from a suggestion",
};
const STATUS_END: Record<string, string> = {
  USER: "ended by them",
  BREAK: "ended by a break",
  END_DAY: "ended with the day",
  NO_ANSWER: "ended with no answer to the 2 hour check",
  AUTO_CLOSED: "ended when the day closed automatically",
};

/** How an In a meeting status began and ended (3.6); null for any other meeting. */
export function statusMeetingLine(
  m: Pick<MeetingRecordView, "kind" | "startSource" | "endReason">,
): string | null {
  if (m.kind !== "STATUS") return null;
  const parts = [m.startSource ? STATUS_SOURCE[m.startSource] : null];
  if (m.endReason) parts.push(STATUS_END[m.endReason]);
  return parts.filter(Boolean).join(", ") || null;
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
  const t = formatMinutesShort(min);
  return reason ? `${t} late: ${reason}` : `${t} late, no reason given`;
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
