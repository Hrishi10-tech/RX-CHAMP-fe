import type { ChipTone } from "@/components/ui/Chip";
import {
  ACTIVE_STATUSES,
  type TeamCounts,
  type TeamFilters,
  type TeamPerson,
  type TeamStatus,
} from "@/features/team/types";

export const TEAM_STATUS: Record<TeamStatus, { label: string; tone: ChipTone; dot: string }> = {
  WORKING: { label: "Working", tone: "success", dot: "bg-emerald-500" },
  BREAK: { label: "On a break", tone: "warning", dot: "bg-amber-500" },
  MEETING: { label: "In a meeting", tone: "brand", dot: "bg-[rgb(34_34_204)]" },
  AWAY: { label: "Away", tone: "danger", dot: "bg-rose-500" },
  NOT_STARTED: { label: "Not started", tone: "neutral", dot: "bg-slate-300" },
  ENDED: { label: "Day ended", tone: "info", dot: "bg-sky-500" },
};

export function teamStatusLook(status: string): { label: string; tone: ChipTone; dot: string } {
  return (
    (TEAM_STATUS as Record<string, (typeof TEAM_STATUS)[TeamStatus]>)[status] ?? {
      label: status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ") : "",
      tone: "neutral",
      dot: "bg-slate-300",
    }
  );
}

/** A day is open now: working, on a break, in a meeting or away (SPEC 5.4). */
export function isActive(person: Pick<TeamPerson, "status">): boolean {
  return ACTIVE_STATUSES.includes(person.status);
}

/** The counts for a list of people, so tiles always agree with the rows shown. */
export function teamCounts(people: Pick<TeamPerson, "status">[]): TeamCounts {
  const counts: TeamCounts = {
    all: people.length,
    active: 0,
    working: 0,
    onBreak: 0,
    inMeeting: 0,
    away: 0,
    notStarted: 0,
    ended: 0,
  };
  for (const p of people) {
    if (isActive(p)) counts.active += 1;
    if (p.status === "WORKING") counts.working += 1;
    else if (p.status === "BREAK") counts.onBreak += 1;
    else if (p.status === "MEETING") counts.inMeeting += 1;
    else if (p.status === "AWAY") counts.away += 1;
    else if (p.status === "NOT_STARTED") counts.notStarted += 1;
    else if (p.status === "ENDED") counts.ended += 1;
  }
  return counts;
}

/** Search matches name, designation and department, ignoring case. */
function matchesQuery(person: TeamPerson, q: string): boolean {
  if (!q) return true;
  const hay = [person.name, person.designation ?? "", person.department?.name ?? ""]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

const STATUS_ORDER: Record<TeamStatus, number> = {
  AWAY: 0,
  WORKING: 1,
  MEETING: 2,
  BREAK: 3,
  NOT_STARTED: 4,
  ENDED: 5,
};

/**
 * The rows the Team page shows for its filters: Active or All, one department
 * or every one, and the search. Away first (it needs a look), then by name.
 */
export function filterTeam(people: TeamPerson[], filters: TeamFilters): TeamPerson[] {
  const q = filters.q.trim();
  return people
    .filter((p) => filters.view === "all" || isActive(p))
    .filter((p) => !filters.departmentId || p.department?.id === filters.departmentId)
    .filter((p) => matchesQuery(p, q))
    .sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
        a.name.localeCompare(b.name),
    );
}

/** Focus against target as a 0..100 share for a bar. */
export function focusShare(focusSec: number, targetSec: number): number {
  if (!targetSec || targetSec <= 0) return focusSec > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (focusSec / targetSec) * 100));
}
