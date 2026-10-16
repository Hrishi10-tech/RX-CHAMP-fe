import { CalendarClock, Clock3, Undo2 } from "lucide-react";

import type { SelectOption } from "@/components/ui/types";
import { formatHmRange } from "@/features/shifts/lib/time";
import { formatWorkDays } from "@/features/shifts/lib/workDays";
import type { ShiftView } from "@/features/shifts/types";

/** Select value meaning "no shift of its own": the default (departments) or the department's (people). */
export const FALLBACK_SHIFT = "__fallback__";

/** Shifts as select options: "General · 09:30–18:30", described by days and default. */
export function shiftSelectOptions(shifts: ShiftView[] | undefined): SelectOption[] {
  return (shifts ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} · ${formatHmRange(s.start, s.end)}`,
    description: [formatWorkDays(s.workDays), s.isDefault ? "Default shift" : null]
      .filter(Boolean)
      .join(" · "),
    icon: Clock3,
  }));
}

export function departmentFallbackOption(defaultShift: ShiftView | undefined): SelectOption {
  return {
    value: FALLBACK_SHIFT,
    label: "Default shift",
    description: defaultShift
      ? `${defaultShift.name} · ${formatHmRange(defaultShift.start, defaultShift.end)}`
      : "No department shift",
    icon: CalendarClock,
  };
}

export const PERSON_FALLBACK_OPTION: SelectOption = {
  value: FALLBACK_SHIFT,
  label: "Back to department shift",
  description: "Removes the personal override",
  icon: Undo2,
};
