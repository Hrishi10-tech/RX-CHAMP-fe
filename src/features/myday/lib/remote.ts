import type { WorkdayTodayView } from "@/features/workday/types";

/**
 * 4.1: a day biometric staff work from home, started and ended from the portal or the phone,
 * reads "Remote" everywhere: to them and to their managers.
 */
export const REMOTE_LABEL = "Remote";

/** The work session the portal or the phone opens for a remote day (the API's source). */
export const REMOTE_SOURCE = "MOBILE_WFH";

/** Whether the open session of the day is a remote one (started from the portal or the phone). */
export function remoteRunning(
  day: Pick<WorkdayTodayView, "state" | "sessions"> | null | undefined,
): boolean {
  if (!day || day.state !== "OPEN") return false;
  return (day.sessions ?? []).some((s) => s.endedAt === null && s.source === REMOTE_SOURCE);
}
