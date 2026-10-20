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

/** A 4.0 quick break (taken any time, from the break buffer), not a shift's break. */
export function isQuickBreak(r: Pick<BreakRecordView, "kind">): boolean {
  return r.kind === "QUICK";
}

/** How long the break was meant to last: the slot's length, or a quick break's planned length. */
function lengthMin(r: Pick<BreakRecordView, "durationMin" | "kind" | "plannedMin">): number | null {
  if (r.durationMin) return r.durationMin;
  return isQuickBreak(r) && r.plannedMin ? r.plannedMin : null;
}

/** "Quick break (10 min)" for a quick break; a shift's or unscheduled break keeps its label. */
export function recordLabel(r: Pick<BreakRecordView, "kind" | "label" | "plannedMin">): string {
  if (!isQuickBreak(r)) return r.label;
  return r.plannedMin ? `Quick break (${r.plannedMin} min)` : "Quick break";
}

/** The heading over a person's breaks that matched no slot: quick breaks, unscheduled ones, or both. */
export function unscheduledHeading(records: Pick<BreakRecordView, "kind">[]): string {
  const quick = records.filter(isQuickBreak).length;
  if (quick === 0) return "Outside the schedule";
  return quick === records.length ? "Quick breaks" : "Quick and unscheduled breaks";
}

/** "Took 19 min of 15", "12 min so far", or "Took 8 min" for a break with no set length. */
export function tookLabel(
  r: Pick<BreakRecordView, "tookSec" | "durationMin" | "inProgress"> &
    Partial<Pick<BreakRecordView, "kind" | "plannedMin">>,
): string {
  const took = formatMinutes(r.tookSec);
  if (r.inProgress) return `${took} so far`;
  const length = lengthMin({
    kind: r.kind ?? null,
    durationMin: r.durationMin,
    plannedMin: r.plannedMin,
  });
  return length ? `Took ${took} of ${length}` : `Took ${took}`;
}

/** "4 min over", or null when the break stayed within its length. */
export function overrunLabel(
  r: Pick<BreakRecordView, "overrunSec"> &
    Partial<Pick<BreakRecordView, "kind" | "plannedMin" | "tookSec" | "inProgress">>,
): string | null {
  const over = r.overrunSec > 0 ? r.overrunSec : quickOverSec(r);
  return over > 0 ? `${formatMinutes(over)} over` : null;
}

/**
 * How far a finished quick break ran past the length the person picked. The API
 * sends `overrunSec` 0 for quick breaks (the time over comes out of the buffer,
 * then goes unpaid), so it is worked out from `tookSec` and `plannedMin`.
 */
export function quickOverSec(
  r: Partial<Pick<BreakRecordView, "kind" | "plannedMin" | "tookSec" | "inProgress">>,
): number {
  if (r.kind !== "QUICK" || !r.plannedMin || r.inProgress) return 0;
  const over = (r.tookSec ?? 0) - r.plannedMin * 60;
  // Under half a minute reads as nothing ("0 min over" would say nothing).
  return over >= 30 ? over : 0;
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
