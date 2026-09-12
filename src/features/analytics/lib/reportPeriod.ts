import { format, startOfMonth, startOfWeek } from "date-fns";

import type { SelectOption } from "@/components/ui/types";

/** The presets offered in the export dialog, plus the escape hatch to pick dates by hand. */
export type ReportPeriod = "today" | "week" | "month" | "custom";

export const PERIOD_OPTIONS: SelectOption[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Date Range" },
];

function iso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * The range a preset covers. Every one ends today — a timesheet cannot report on days
 * that have not happened — so "this month" means the 1st through today, not the whole
 * calendar month.
 *
 * Returns null for `custom`, where the caller's own two dates stand instead.
 */
export function periodRange(
  period: ReportPeriod,
  today: Date = new Date(),
): { from: string; to: string } | null {
  const to = iso(today);

  switch (period) {
    case "today":
      return { from: to, to };
    // Monday-based, matching how the rest of the analytics feature keys weekdays.
    case "week":
      return { from: iso(startOfWeek(today, { weekStartsOn: 1 })), to };
    case "month":
      return { from: iso(startOfMonth(today)), to };
    case "custom":
      return null;
  }
}
