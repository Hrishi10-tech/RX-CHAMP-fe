import type { ChipTone } from "@/components/ui/Chip";
import type { ShiftSource } from "@/features/shifts/types";
import type {
  BreakApprovalStatus,
  BreakRecordView,
  BreakTiming,
  TeamCellStatus,
} from "@/features/breaks/types";
import { formatMinutes } from "@/lib/time/businessTime";

/** "On time", "12 min late", "5 min early", "Outside window", "Unscheduled". */
export function timingLabel(r: Pick<BreakRecordView, "timing" | "minutesOff">): string {
  switch (r.timing) {
    case "ON_TIME":
      return "On time";
    case "EARLY":
      return `${Math.max(1, r.minutesOff)} min early`;
    case "LATE":
      return `${Math.max(1, r.minutesOff)} min late`;
    case "OUTSIDE_WINDOW":
      return "Outside window";
    default:
      return "Unscheduled";
  }
}

export function timingTone(timing: BreakTiming): ChipTone {
  switch (timing) {
    case "ON_TIME":
      return "success";
    case "EARLY":
    case "LATE":
      return "warning";
    case "OUTSIDE_WINDOW":
      return "danger";
    default:
      return "neutral";
  }
}

export const APPROVAL_LABEL: Record<BreakApprovalStatus, string> = {
  NOT_REQUIRED: "No approval needed",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const APPROVAL_TONE: Record<BreakApprovalStatus, ChipTone> = {
  NOT_REQUIRED: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

/**
 * Team-day cell states. Since 3.1 "Skipped" means a skip record (the person
 * pressed Skip break, or the break was skipped automatically while they worked),
 * so a window that closed with nothing recorded (the person was not working, or
 * an older app) reads "Not taken", in neutral grey, as in Team today.
 */
export const CELL_STATUS: Record<TeamCellStatus, { label: string; tone: ChipTone }> = {
  UPCOMING: { label: "Upcoming", tone: "neutral" },
  OPEN: { label: "Open", tone: "info" },
  IN_PROGRESS: { label: "In progress", tone: "brand" },
  TAKEN: { label: "Taken", tone: "success" },
  SKIPPED: { label: "Skipped", tone: "violet" },
  AUTO_SKIPPED: { label: "Auto-skipped", tone: "neutral" },
  MISSED: { label: "Not taken", tone: "neutral" },
};

/** The cell's words and colour; a state this portal does not know yet reads as it came. */
export function cellStatusLook(status: string): { label: string; tone: ChipTone } {
  return (
    (CELL_STATUS as Record<string, { label: string; tone: ChipTone }>)[status] ?? {
      label: status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ") : "",
      tone: "neutral",
    }
  );
}

/** A 3.1 skip record (manual or automatic), as opposed to a break that was taken. */
export function isSkipRecord(r: Pick<BreakRecordView, "outcome">): boolean {
  return r.outcome === "SKIPPED" || r.outcome === "AUTO_SKIPPED";
}

/** "Took 19 min of 15", "12 min so far", or "Took 8 min" for a break with no set length. */
export function tookLabel(
  r: Pick<BreakRecordView, "tookSec" | "durationMin" | "inProgress">,
): string {
  const took = formatMinutes(r.tookSec);
  if (r.inProgress) return `${took} so far`;
  return r.durationMin ? `Took ${took} of ${r.durationMin}` : `Took ${took}`;
}

/** "4 min over", or null when the break stayed within its length. */
export function overrunLabel(r: Pick<BreakRecordView, "overrunSec">): string | null {
  return r.overrunSec > 0 ? `${formatMinutes(r.overrunSec)} over` : null;
}

export const SOURCE_LABEL: Record<ShiftSource, string> = {
  OVERRIDE: "Personal override",
  DEPARTMENT: "Department shift",
  DEFAULT: "Default shift",
  NONE: "No shift",
};

export const SOURCE_TONE: Record<ShiftSource, ChipTone> = {
  OVERRIDE: "brand",
  DEPARTMENT: "neutral",
  DEFAULT: "neutral",
  NONE: "warning",
};
