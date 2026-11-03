import { formatDuration, roundMinutes } from "@/lib/format/duration";
import type { PersonDaySummary } from "@/features/reports/types";

/**
 * The arithmetic behind the day's focus time, so payroll can follow it. Every
 * part is rounded to the minute first and time worked is worked out from those,
 * so the sum on screen always adds up, and focus time and breaks read the same
 * as in the figures above.
 */
export function focusSum(
  s: Pick<PersonDaySummary, "focusSec" | "breakSec" | "approvedPlusSec" | "rejectedMinusSec"> & {
    adjustedSec?: number;
  },
): string {
  const focus = Math.max(0, roundMinutes(s.focusSec));
  const breaks = Math.max(0, roundMinutes(s.breakSec));
  const plus = Math.max(0, roundMinutes(s.approvedPlusSec));
  const minus = Math.max(0, roundMinutes(s.rejectedMinusSec));
  // 3.3: minutes added or taken off by hand, signed.
  const adjusted = roundMinutes(s.adjustedSec ?? 0);
  // Focus time never goes below zero, so once deductions exceed the time worked
  // the parts cannot be read back from the total; say so instead of inventing them.
  if (focus === 0 && (minus > 0 || adjusted < 0)) {
    const deducted = minus - Math.min(0, adjusted);
    return `0m = time worked, less ${formatDuration(deducted * 60)} of deductions (never below zero)`;
  }
  const worked = focus + breaks - plus + minus - adjusted;
  const parts = [`time worked ${formatDuration(worked * 60)}`];
  if (breaks) parts.push(`− breaks ${formatDuration(breaks * 60)}`);
  if (plus) parts.push(`+ ${formatDuration(plus * 60)} approved back`);
  if (minus) parts.push(`− ${formatDuration(minus * 60)} rejected`);
  if (adjusted > 0) parts.push(`+ ${formatDuration(adjusted * 60)} adjusted by hand`);
  if (adjusted < 0) parts.push(`− ${formatDuration(-adjusted * 60)} adjusted by hand`);
  return `${formatDuration(focus * 60)} = ${parts.join(" ")}`;
}
