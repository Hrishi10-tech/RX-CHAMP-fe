import type { LeaveRequestView } from "@/features/leave/types";
import type { WfhRequestView, WfhScheduleView } from "@/features/wfh/types";
import type { DayMark } from "@/features/myday/types";

/** Requests that still mean something on a calendar: waiting, or approved. */
function live(status: string): boolean {
  return status === "PENDING" || status === "APPROVED";
}

function partLabel(base: string, days: number, label: string): string {
  if (days >= 1) return base;
  return label ? `${base}, ${label.charAt(0).toLowerCase()}${label.slice(1)}` : base;
}

/**
 * Leave and work from home by day, for Staff's year (the phone app's Calendar): every
 * date of a waiting or approved request, and the next days of a manager's schedule.
 * Leave wins a day both claim.
 */
export function dayMarks(
  leave: readonly Pick<LeaveRequestView, "status" | "categoryLabel" | "dates">[],
  wfh: readonly Pick<WfhRequestView, "status" | "dates">[],
  schedules: readonly Pick<WfhScheduleView, "state" | "next">[] = [],
): Map<string, DayMark> {
  const marks = new Map<string, DayMark>();
  for (const s of schedules) {
    if (s.state === "ENDED") continue;
    for (const d of s.next ?? []) {
      marks.set(d.date, { kind: "WFH", label: "Remote (schedule)", pending: false });
    }
  }
  for (const r of wfh) {
    if (!live(r.status)) continue;
    for (const d of r.dates ?? []) {
      marks.set(d.date, {
        kind: "WFH",
        label: partLabel("Remote", d.days, d.label),
        pending: r.status === "PENDING",
      });
    }
  }
  for (const r of leave) {
    if (!live(r.status)) continue;
    for (const d of r.dates ?? []) {
      marks.set(d.date, {
        kind: "LEAVE",
        label: partLabel(`${r.categoryLabel || "Leave"} leave`, d.days, d.label),
        pending: r.status === "PENDING",
      });
    }
  }
  return marks;
}
