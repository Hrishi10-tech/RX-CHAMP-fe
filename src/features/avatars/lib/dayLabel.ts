import type { FloatingIconStatus } from "@/components/avatar/floatingIconGeometry";
import { todayKey } from "@/lib/time/businessTime";

/** Instead of the words beside the icon, when today's time could not be read. */
export const DAY_NOT_LOADED = "Today's time did not load.";

/** "5h 12m", always with two digits of minutes. */
export function formatWorked(sec: number): string {
  const minutes = Math.floor(Math.max(0, sec) / 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** "8h", or "8h 30m" for a target that is not a whole number of hours. */
export function formatTarget(sec: number): string {
  const minutes = Math.floor(Math.max(0, sec) / 60);
  const rest = minutes % 60;
  const hours = `${Math.floor(minutes / 60)}h`;
  return rest === 0 ? hours : `${hours} ${String(rest).padStart(2, "0")}m`;
}

/** Today's share of the target, 0 to 1. */
export function progressOf(workedSec: number, targetSec: number): number {
  if (targetSec <= 0) return 0;
  return Math.min(1, Math.max(0, workedSec) / targetSec);
}

/**
 * The words beside the icon: "Working · 5h 12m of 8h". `date` is the day the answer is about:
 * a day ended stays on show until the next Start day, and is "today" only while it is.
 */
export function dayLabel(
  status: FloatingIconStatus,
  workedSec: number,
  targetSec: number,
  date?: string,
  /** 4.1: the day is a remote one, so Working reads Remote. */
  remote = false,
): string {
  const worked = formatWorked(workedSec);
  const ofTarget = `${worked} of ${formatTarget(targetSec)}`;
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "WORKING":
      return `${remote ? "Remote" : "Working"} · ${ofTarget}`;
    case "MEETING":
      return `In a meeting · ${ofTarget}`;
    case "BREAK":
      return `On break · ${ofTarget}`;
    case "ENDED":
      return date && date < todayKey() ? `Day ended · ${worked}` : `Day ended · ${worked} today`;
  }
}

/** The extra time once the target is passed, a line of its own: "+15 min over target". */
export function overTargetLabel(status: FloatingIconStatus, overSec: number): string | null {
  if (status === "NOT_STARTED" || status === "ENDED") return null;
  const minutes = Math.floor(Math.max(0, overSec) / 60);
  if (minutes < 1) return null;
  if (minutes < 60) return `+${minutes} min over target`;
  return `+${formatWorked(overSec)} over target`;
}
