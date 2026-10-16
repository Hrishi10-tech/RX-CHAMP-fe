import type { ShiftUsage } from "@/features/shifts/types";

/**
 * Who a shift is assigned to today, for the delete confirmation:
 * "the Support department and 2 people by override", or null when nobody.
 * People on the default shift are not counted; the default can't be deleted anyway.
 */
export function assignedToday(usage: ShiftUsage): string | null {
  const { departments, overrides } = usage;
  const bits: string[] = [];
  if (departments.length === 1) bits.push(`the ${departments[0]} department`);
  else if (departments.length > 1) bits.push(`${departments.length} departments`);
  if (overrides > 0) bits.push(`${overrides} ${overrides === 1 ? "person" : "people"} by override`);
  return bits.length ? bits.join(" and ") : null;
}
