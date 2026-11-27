import type { WorkdayTodayView } from "@/features/workday/types";

/** The API's limit on a late-start reason. */
export const LATE_REASON_MAX = 2000;
/** When the day does not say (an older server). */
export const DEFAULT_REASON_MIN = 10;

/**
 * Whether Today should ask why the day started late: the server asks for one, the day has
 * started, and none was given yet (the phone app's rule).
 */
export function needsLateReason(
  day: Pick<WorkdayTodayView, "state" | "lateStart"> | null | undefined,
): boolean {
  const late = day?.lateStart;
  if (!day || !late || day.state === "NOT_STARTED") return false;
  return Boolean(late.needsReason) && !late.reason;
}

/**
 * What is wrong with a reason, or null when it can be sent. A preset answer is enough as it
 * is; anything typed needs the organisation's minimum length.
 */
export function lateReasonProblem(
  text: string,
  minChars: number,
  presets: readonly string[] = [],
): string | null {
  const reason = text.trim();
  if (!reason) return "Say why the day started late.";
  if (reason.length > LATE_REASON_MAX) {
    return `Keep it under ${LATE_REASON_MAX} characters.`;
  }
  if (presets.includes(reason)) return null;
  const min = minChars > 0 ? minChars : DEFAULT_REASON_MIN;
  if (reason.length < min) return `Write at least ${min} characters.`;
  return null;
}
