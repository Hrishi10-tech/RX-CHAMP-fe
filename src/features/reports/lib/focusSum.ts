import { formatDuration, roundMinutes } from "@/lib/format/duration";
import type { PersonDaySummary } from "@/features/reports/types";

/**
 * The arithmetic behind the day's focus time, so payroll can follow it. Every
 * part is rounded to the minute first and time worked is worked out from those,
 * so the sum on screen always adds up, and focus time and breaks read the same
 * as in the figures above.
 */
export function focusSum(
  s: Pick<PersonDaySummary, "focusSec" | "breakSec" | "approvedPlusSec" | "rejectedMinusSec">,
): string {
  const focus = Math.max(0, roundMinutes(s.focusSec));
  const breaks = Math.max(0, roundMinutes(s.breakSec));
  const plus = Math.max(0, roundMinutes(s.approvedPlusSec));
  const minus = Math.max(0, roundMinutes(s.rejectedMinusSec));
  const worked = focus + breaks - plus + minus;
  const parts = [`time worked ${formatDuration(worked * 60)}`];
  if (breaks) parts.push(`− breaks ${formatDuration(breaks * 60)}`);
  if (plus) parts.push(`+ ${formatDuration(plus * 60)} approved back`);
  if (minus) parts.push(`− ${formatDuration(minus * 60)} rejected`);
  return `${formatDuration(focus * 60)} = ${parts.join(" ")}`;
}
