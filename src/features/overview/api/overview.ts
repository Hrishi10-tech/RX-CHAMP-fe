import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import type { OverviewView } from "@/features/overview/types";

/** SPEC 5.4 `GET /overview`: everything the Overview page shows, in one request. */

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** A figure the server may leave out: null then, never a made-up zero. */
function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function people(value: unknown): { id: string; name: string }[] {
  return list(value)
    .map(rec)
    .filter((p) => typeof p.id === "string")
    .map((p) => ({ id: p.id as string, name: str(p.name) }));
}

export function readOverview(raw: unknown): OverviewView {
  const r = rec(raw);
  const scope = rec(r.scope);
  const org = rec(scope.organisation);
  const today = rec(r.today);
  const approvals = rec(r.approvals);
  const month = rec(r.month);
  return {
    scope: {
      organisation: typeof org.id === "string" ? { id: org.id, name: str(org.name) } : null,
      departments: people(scope.departments),
    },
    today: {
      people: num(today.people),
      started: num(today.started),
      working: num(today.working),
      onBreak: num(today.onBreak),
      inMeeting: num(today.inMeeting),
      away: num(today.away),
      notStarted: num(today.notStarted),
      lateStarts: num(today.lateStarts),
      ended: num(today.ended),
      focusSec: num(today.focusSec),
      targetSec: num(today.targetSec),
      unverifiedSec: Math.max(0, num(today.unverifiedSec)),
      paidSec: numOrNull(today.paidSec),
    },
    approvals: {
      pending: num(approvals.pending),
      overdue: num(approvals.overdue),
      oldestDueAt: typeof approvals.oldestDueAt === "string" ? approvals.oldestDueAt : null,
    },
    month: {
      month: str(month.month),
      workingDays: num(month.workingDays),
      elapsedWorkingDays: num(month.elapsedWorkingDays),
      focusSec: num(month.focusSec),
      targetSec: num(month.targetSec),
      unverifiedSec: Math.max(0, num(month.unverifiedSec)),
      paidSec: numOrNull(month.paidSec),
      full: num(month.full),
      half: num(month.half),
      absent: num(month.absent),
    },
    departments: list(r.departments)
      .map(rec)
      .filter((d) => typeof d.id === "string")
      .map((d) => ({
        id: d.id as string,
        name: str(d.name),
        icon: str(d.icon, "briefcase"),
        staff: num(d.staff),
        working: num(d.working),
        focusSec: num(d.focusSec),
        targetSec: num(d.targetSec),
      })),
    attention: list(r.attention)
      .map(rec)
      .filter((a) => typeof a.kind === "string")
      .map((a) => ({ kind: a.kind as string, count: num(a.count), people: people(a.people) })),
    nextHolidays: list(r.nextHolidays)
      .map(rec)
      .filter((h) => typeof h.date === "string")
      .map((h) => ({ date: h.date as string, label: str(h.label) })),
    hourly: Array.isArray(r.hourly)
      ? r.hourly
          .map(rec)
          .filter((h) => typeof h.hour === "number")
          .map((h) => ({ hour: num(h.hour), working: num(h.working) }))
          .sort((a, b) => a.hour - b.hour)
      : null,
    generatedAt: typeof r.generatedAt === "string" && r.generatedAt ? r.generatedAt : null,
  };
}

export async function getOverview(): Promise<OverviewView> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/overview");
  return readOverview(unwrap(data, "Failed to load the overview"));
}
