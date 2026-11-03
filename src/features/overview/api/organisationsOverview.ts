import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import type { ApprovalItemView } from "@/features/approvals/types";

/**
 * 3.3 `GET /overview/organisations`: the Super Manager's home (the Super Admin's
 * too on "All organisations"). Totals in view, one card per organisation, and the
 * first items waiting for a decision. Agent issues come from `GET /agent-health`.
 */

export interface OrgTodayNumbers {
  people: number;
  started: number;
  working: number;
  onBreak: number;
  inMeeting: number;
  away: number;
  notStarted: number;
  ended: number;
  lateStarts: number;
  focusSec: number;
  targetSec: number;
  noAgent: number;
}

export interface OrgCard {
  id: string;
  name: string;
  today: OrgTodayNumbers;
  approvals: { pending: number; overdue: number; oldestDueAt: string | null };
}

export interface OrganisationsOverview {
  /** The organisation in view, or null for "All organisations". */
  organisation: { id: string; name: string } | null;
  combined: boolean;
  totals: OrgTodayNumbers & { pendingApprovals: number; overdueApprovals: number };
  organisations: OrgCard[];
  waiting: { items: ApprovalItemView[]; total: number };
  generatedAt: string | null;
}

export const organisationsOverviewKeys = {
  all: ["overview", "organisations"] as const,
};

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function today(value: unknown): OrgTodayNumbers {
  const t = rec(value);
  return {
    people: num(t.people),
    started: num(t.started),
    working: num(t.working),
    onBreak: num(t.onBreak),
    inMeeting: num(t.inMeeting),
    away: num(t.away),
    notStarted: num(t.notStarted),
    ended: num(t.ended),
    lateStarts: num(t.lateStarts),
    focusSec: num(t.focusSec),
    targetSec: num(t.targetSec),
    noAgent: num(t.noAgent),
  };
}

/** Reads the answer defensively: a missing figure is 0, a row without an id is dropped. */
export function readOrganisationsOverview(raw: unknown): OrganisationsOverview {
  const r = rec(raw);
  const scope = rec(r.scope);
  const org = rec(scope.organisation);
  const totals = rec(r.totals);
  const waiting = rec(r.waiting);
  const items = Array.isArray(waiting.items)
    ? (waiting.items as ApprovalItemView[]).filter((i) => i && i.id && i.type)
    : [];
  return {
    organisation: typeof org.id === "string" ? { id: org.id, name: str(org.name) } : null,
    combined: scope.combined === true,
    totals: {
      ...today(totals),
      pendingApprovals: num(totals.pendingApprovals),
      overdueApprovals: num(totals.overdueApprovals),
    },
    organisations: (Array.isArray(r.organisations) ? r.organisations : [])
      .map(rec)
      .filter((o) => typeof o.id === "string")
      .map((o) => {
        const a = rec(o.approvals);
        return {
          id: o.id as string,
          name: str(o.name),
          today: today(o.today),
          approvals: {
            pending: num(a.pending),
            overdue: num(a.overdue),
            oldestDueAt: typeof a.oldestDueAt === "string" ? a.oldestDueAt : null,
          },
        };
      }),
    waiting: { items, total: Math.max(num(waiting.total), items.length) },
    generatedAt: typeof r.generatedAt === "string" && r.generatedAt ? r.generatedAt : null,
  };
}

export async function getOrganisationsOverview(): Promise<OrganisationsOverview> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/overview/organisations");
  return readOrganisationsOverview(unwrap(data, "Failed to load the overview"));
}
