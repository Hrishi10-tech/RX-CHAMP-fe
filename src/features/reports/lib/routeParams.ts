import { isDateKey, isMonthKey, monthOfDate } from "@/lib/time/months";
import { parseIds } from "@/features/reports/lib/query";
import type { ReportPeriod } from "@/features/reports/lib/period";

interface Params {
  get(name: string): string | null;
}

/**
 * The period a report URL asks for: `?date=` for a day, `?month=` for a month.
 * Anything missing, malformed or in the future falls back to this month, so a
 * hand-edited or stale link still opens a report rather than an error.
 */
export function periodFromParams(params: Params, today: string): ReportPeriod {
  const date = params.get("date");
  if (isDateKey(date) && date <= today) return { kind: "day", date };
  const month = params.get("month");
  if (isMonthKey(month) && month <= monthOfDate(today)) return { kind: "month", month };
  return { kind: "month", month: monthOfDate(today) };
}

/** The people a team report URL narrows to (`managerId`, `userIds=a,b`). */
export function peopleFromParams(params: Params): { managerId?: string; userIds?: string[] } {
  const managerId = params.get("managerId")?.trim() || undefined;
  const userIds = parseIds(params.get("userIds"));
  return { managerId, userIds: userIds.length ? userIds : undefined };
}

/** `?print=1`: open the print dialog once the report has loaded (the PDF link). */
export function wantsPrint(params: Params): boolean {
  return params.get("print") === "1";
}
