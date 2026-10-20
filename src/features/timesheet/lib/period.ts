import { addDaysToKey } from "@/lib/time/businessTime";

import type { SelectOption } from "@/components/ui/types";

export type TimesheetPeriod = "today" | "week" | "month" | "lastMonth" | "custom";

export const PERIOD_OPTIONS: SelectOption[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Choose dates" },
];

function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  // ISO weekday, Monday = 1.
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The range a preset covers, in business days ("YYYY-MM-DD"). Ranges that would
 * reach past today stop at today: a timesheet has nothing to say about days
 * that have not happened. `custom` is null (the dialog's own dates stand).
 */
export function periodRange(
  period: TimesheetPeriod,
  today: string,
): { from: string; to: string } | null {
  const [y, m] = today.split("-").map(Number);
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: addDaysToKey(today, 1 - weekdayOf(today)), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "lastMonth": {
      const year = m === 1 ? y - 1 : y;
      const month = m === 1 ? 12 : m - 1;
      const mm = String(month).padStart(2, "0");
      return {
        from: `${year}-${mm}-01`,
        to: `${year}-${mm}-${String(lastDayOfMonth(year, month)).padStart(2, "0")}`,
      };
    }
    case "custom":
      return null;
  }
}

/** Inclusive day count of a range; 0 when it runs backwards or is not a range. */
export function daysInRange(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}
