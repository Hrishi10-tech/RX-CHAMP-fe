import { apiClient, type ApiResponse } from "@/lib/api";
import { readMeta, unwrap } from "@/lib/api/list";
import { paidSecOf } from "@/lib/format/payroll";
import { teamCounts } from "@/features/team/lib/team";
import type { TeamCounts, TeamPerson, TeamStatus, TeamView } from "@/features/team/types";

/**
 * SPEC 5.4 `GET /team?view=active|all&departmentId=&q=&page=&limit=` (Admin,
 * Super Admin, Manager with a grant): one page of the people in scope with
 * today's status and focus. The server filters and pages; `counts` covers
 * everyone the filters match and `meta` says how many pages there are.
 */
const STATUSES: TeamStatus[] = ["WORKING", "BREAK", "MEETING", "AWAY", "NOT_STARTED", "ENDED"];

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export function readTeamPerson(raw: unknown): TeamPerson | null {
  const r = rec(raw);
  if (typeof r.id !== "string") return null;
  const dept = rec(r.department);
  const status = typeof r.status === "string" ? r.status.toUpperCase() : "";
  return {
    id: r.id,
    name: typeof r.name === "string" ? r.name : "",
    role: typeof r.role === "string" ? r.role : "USER",
    designation: strOrNull(r.designation),
    department:
      typeof dept.id === "string"
        ? {
            id: dept.id,
            name: typeof dept.name === "string" ? dept.name : "",
            icon: typeof dept.icon === "string" ? dept.icon : "briefcase",
          }
        : null,
    status: (STATUSES as string[]).includes(status) ? (status as TeamStatus) : "NOT_STARTED",
    since: strOrNull(r.since),
    startedAt: strOrNull(r.startedAt),
    focusSec: num(r.focusSec),
    targetSec: num(r.targetSec),
    paidSec: paidSecOf(r),
    unverifiedSec: Math.max(0, num(r.unverifiedSec)),
    online: r.online === true,
    agentVersion: strOrNull(r.agentVersion),
    lateStartMin: num(r.lateStartMin),
  };
}

export async function getTeam(
  params: {
    view?: "active" | "all";
    departmentId?: string;
    q?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<TeamView> {
  // The backend pages the list: page and limit are always sent (1 and 10 by default).
  const query: Record<string, string | number> = {
    view: params.view ?? "all",
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  };
  if (params.departmentId) query.departmentId = params.departmentId;
  if (params.q) query.q = params.q;
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/team", { params: query });
  const body = rec(unwrap(data, "Failed to load the team"));
  const people = (Array.isArray(body.people) ? body.people : [])
    .map(readTeamPerson)
    .filter((p): p is TeamPerson => p !== null);
  const c = rec(body.counts);
  const counts: TeamCounts =
    typeof c.all === "number"
      ? {
          all: num(c.all),
          active: num(c.active),
          working: num(c.working),
          onBreak: num(c.onBreak),
          inMeeting: num(c.inMeeting),
          away: num(c.away),
          notStarted: num(c.notStarted),
          ended: num(c.ended),
        }
      : teamCounts(people);
  // `meta` inside `data`, or beside it (the 3.0 list shape).
  const meta = readMeta(body.meta) ?? readMeta(rec(data).meta) ?? null;
  return { date: strOrNull(body.date), counts, people, meta };
}
