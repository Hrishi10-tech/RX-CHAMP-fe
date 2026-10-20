import { cleanParams } from "@/lib/api/list";
import type {
  ApprovalCategory,
  ApprovalType,
  GetApprovalsParams,
} from "@/features/approvals/types";

/**
 * The query string for `GET /approvals`: only what is set, `overdue` only when
 * true, and `scope` only for a Super Admin (a Manager's is always "mine").
 */
export function buildApprovalsQuery(
  params: GetApprovalsParams,
  isSuperAdmin = true,
): Record<string, string | number | boolean> {
  return cleanParams({
    status: params.status,
    scope: isSuperAdmin ? params.scope : undefined,
    type: params.type,
    category: params.category,
    overdue: params.overdue === true ? true : undefined,
    date: params.date,
    userId: params.userId,
    page: params.page,
    limit: params.limit,
  });
}

/**
 * How the API names a type in a path and in a bulk-approve item: lower case,
 * `break` or `meeting`. Lists and item views use `BREAK` and `MEETING`.
 */
export type ApprovalTypeSegment = "break" | "meeting" | "away";

export function approvalTypeSegment(type: ApprovalType): ApprovalTypeSegment {
  return type === "MEETING" ? "meeting" : type === "AWAY" ? "away" : "break";
}

/** `break`, `BREAK`, `meeting` or `MEETING` as the portal's type; anything else is null. */
export function approvalTypeOf(value: unknown): ApprovalType | null {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  return upper === "BREAK" || upper === "MEETING" || upper === "AWAY" ? upper : null;
}

/** Path segment for one item: `/approvals/break/:id` or `/approvals/meeting/:id`. */
export function approvalPath(type: ApprovalType, id: string, action: string): string {
  return `/api/v1/approvals/${approvalTypeSegment(type)}/${encodeURIComponent(id)}/${action}`;
}

/** The three list tabs of the Approvals page. */
export type ApprovalsTab = "pending" | "overdue" | "decisions";

/** In "All decisions": every item, or only the approved or rejected ones. */
export type DecisionFilter = "ALL" | "APPROVED" | "REJECTED";

/**
 * The "Type" filter: one category, all breaks or all meetings. Kept as one
 * value so the page has a single select; the API takes `type` or `category`.
 */
export type CategoryFilter = "" | "TYPE_BREAK" | "TYPE_MEETING" | "TYPE_AWAY" | ApprovalCategory;

export interface ApprovalsFilters {
  tab: ApprovalsTab;
  decision: DecisionFilter;
  category: CategoryFilter;
  userId: string;
  scope: "mine" | "all";
  page: number;
  limit: number;
}

/** What the page's tabs and filters ask the API for. */
export function paramsForFilters(filters: ApprovalsFilters): GetApprovalsParams {
  const params: GetApprovalsParams = {
    // "Any status" on All decisions means approved or rejected, never pending.
    status:
      filters.tab === "decisions"
        ? filters.decision === "ALL"
          ? "DECIDED"
          : filters.decision
        : "PENDING",
    overdue: filters.tab === "overdue" ? true : undefined,
    scope: filters.scope,
    userId: filters.userId || undefined,
    page: filters.page,
    limit: filters.limit,
  };
  if (filters.category === "TYPE_BREAK") params.type = "BREAK";
  else if (filters.category === "TYPE_MEETING") params.type = "MEETING";
  else if (filters.category === "TYPE_AWAY") params.type = "AWAY";
  else if (filters.category) params.category = filters.category;
  return params;
}
