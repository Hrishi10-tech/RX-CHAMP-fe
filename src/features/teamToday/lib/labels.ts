import type { ChipTone } from "@/components/ui/Chip";
import type { TeamTodayBreakStatus, TeamTodayStatus } from "@/features/teamToday/types";

/** The status pill: what the person is doing now. */
export const PRESENCE_STATUS: Record<TeamTodayStatus, { label: string; tone: ChipTone }> = {
  NOT_STARTED: { label: "Not started", tone: "neutral" },
  WORKING: { label: "Working", tone: "success" },
  BREAK: { label: "Break", tone: "warning" },
  LUNCH: { label: "Lunch", tone: "info" },
  MEETING: { label: "Meeting", tone: "brand" },
  DAY_ENDED: { label: "Day ended", tone: "neutral" },
};

export function presenceLook(status: string): { label: string; tone: ChipTone } {
  return (
    (PRESENCE_STATUS as Record<string, { label: string; tone: ChipTone }>)[status] ?? {
      label: status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ") : "",
      tone: "neutral",
    }
  );
}

/** One break cell. A break window that closed with nothing recorded reads "Not taken". */
export const BREAK_CELL: Record<TeamTodayBreakStatus, { label: string; tone: ChipTone }> = {
  UPCOMING: { label: "Upcoming", tone: "neutral" },
  OPEN: { label: "Open now", tone: "info" },
  IN_PROGRESS: { label: "On it now", tone: "brand" },
  TAKEN: { label: "Taken", tone: "success" },
  SKIPPED: { label: "Skipped", tone: "violet" },
  AUTO_SKIPPED: { label: "Auto-skipped", tone: "neutral" },
  MISSED: { label: "Not taken", tone: "neutral" },
};

export function breakCellLook(status: string): { label: string; tone: ChipTone } {
  return (
    (BREAK_CELL as Record<string, { label: string; tone: ChipTone }>)[status] ?? {
      label: status.toLowerCase().replace(/_/g, " "),
      tone: "neutral",
    }
  );
}
