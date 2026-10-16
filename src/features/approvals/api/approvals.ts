import { apiClient, type ApiResponse, type PaginationMeta } from "@/lib/api";
import { readItems, readPage, unwrap } from "@/lib/api/list";
import {
  approvalPath,
  approvalTypeOf,
  approvalTypeSegment,
  buildApprovalsQuery,
} from "@/features/approvals/lib/query";
import type {
  ApprovalItemView,
  ApprovalRef,
  ApprovalsSummary,
  BulkApproveResult,
  GetApprovalsParams,
} from "@/features/approvals/types";

/**
 * SPEC 3.4. Every request in one module so the contract can be checked against
 * the backend in one place:
 *
 *   GET  /approvals?status&scope&type&category&overdue&date&userId&page&limit
 *   GET  /approvals/summary
 *   GET  /approvals/me?days
 *   POST /approvals/:type/:id/approve   { note? }
 *   POST /approvals/:type/:id/reject    { note }
 *   POST /approvals/:type/:id/reopen
 *   POST /approvals/bulk-approve        { items: { type: "break" | "meeting", id }[], note? }
 */

export interface ApprovalsPage {
  items: ApprovalItemView[];
  meta?: PaginationMeta;
}

/**
 * Marks when an item arrived (`receivedAt`, browser clock): its `dueInSec` and
 * a live meeting's `durationSec` were true then, so countdowns run from here.
 */
export function stampReceived(item: ApprovalItemView, now: number = Date.now()): ApprovalItemView {
  return { ...item, receivedAt: now };
}

/** One page of approval items. Managers get theirs; Super Admins "mine" or "all". */
export async function getApprovals(
  params: GetApprovalsParams = {},
  isSuperAdmin = true,
): Promise<ApprovalsPage> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/approvals", {
    params: buildApprovalsQuery(params, isSuperAdmin),
  });
  const page = readPage<ApprovalItemView>(data, "Failed to load approvals");
  const now = Date.now();
  // A row without its identity cannot be decided or keyed; leave it out rather than crash.
  return {
    ...page,
    items: page.items.filter((i) => i && i.id && i.type).map((i) => stampReceived(i, now)),
  };
}

/** Counts behind the Approvals badge and the summary strip. */
export async function getApprovalsSummary(): Promise<ApprovalsSummary> {
  const { data } = await apiClient.get<ApiResponse<ApprovalsSummary>>("/api/v1/approvals/summary");
  return unwrap(data, "Failed to load approval counts");
}

/** The caller's own items from the last `days` days (1 to 31), pending first. Any role. */
export async function getMyApprovals(days = 7): Promise<ApprovalItemView[]> {
  const safeDays = Math.min(31, Math.max(1, Math.round(days)));
  const { data } = await apiClient.get<ApiResponse<{ items: ApprovalItemView[] }>>(
    "/api/v1/approvals/me",
    { params: { days: safeDays } },
  );
  const now = Date.now();
  return readItems<ApprovalItemView>(unwrap(data, "Failed to load your approvals")).map((i) =>
    stampReceived(i, now),
  );
}

/** Approves one item; the note is optional. 409 ALREADY_DECIDED if someone was quicker. */
export async function approveItem(ref: ApprovalRef, note?: string): Promise<ApprovalItemView> {
  const text = note?.trim();
  const { data } = await apiClient.post<ApiResponse<ApprovalItemView>>(
    approvalPath(ref.type, ref.id, "approve"),
    text ? { note: text } : {},
  );
  return stampReceived(unwrap(data, "Failed to approve"));
}

/** Rejects one item. The note (3+ characters) is shown to the person. 400 NOTE_REQUIRED. */
export async function rejectItem(ref: ApprovalRef, note: string): Promise<ApprovalItemView> {
  const { data } = await apiClient.post<ApiResponse<ApprovalItemView>>(
    approvalPath(ref.type, ref.id, "reject"),
    { note: note.trim() },
  );
  return stampReceived(unwrap(data, "Failed to reject"));
}

/** Puts a decided item back to pending (the decider or a Super Admin). */
export async function reopenItem(ref: ApprovalRef): Promise<ApprovalItemView> {
  const { data } = await apiClient.post<ApiResponse<ApprovalItemView>>(
    approvalPath(ref.type, ref.id, "reopen"),
    {},
  );
  return stampReceived(unwrap(data, "Failed to reopen"));
}

/** Bulk approve, at most 200 at once; what cannot be approved comes back in `skipped`. */
export const BULK_APPROVE_MAX = 200;

interface BulkApproveAnswer {
  approved?: { type?: unknown; id?: unknown }[];
  skipped?: { type?: unknown; id?: unknown; reason?: unknown }[];
}

/** A ref from the answer, with the type as the lists name it; null when unreadable. */
function refOf(raw: { type?: unknown; id?: unknown } | null | undefined): ApprovalRef | null {
  const type = approvalTypeOf(raw?.type);
  return type && typeof raw?.id === "string" && raw.id ? { type, id: raw.id } : null;
}

/**
 * The API takes each item's type in lower case, as in the item paths
 * (`{ type: "break" | "meeting", id }`; `BREAK` is a 400), and answers the same
 * way. The answer is read back into the `BREAK` / `MEETING` the lists use, so a
 * skipped item can be matched to its row.
 */
export async function bulkApprove(items: ApprovalRef[], note?: string): Promise<BulkApproveResult> {
  const text = note?.trim();
  const body = {
    items: items
      .slice(0, BULK_APPROVE_MAX)
      .map(({ type, id }) => ({ type: approvalTypeSegment(type), id })),
    ...(text ? { note: text } : {}),
  };
  const { data } = await apiClient.post<ApiResponse<BulkApproveAnswer>>(
    "/api/v1/approvals/bulk-approve",
    body,
  );
  const result = unwrap(data, "Failed to approve the selected items");
  const approved = (Array.isArray(result.approved) ? result.approved : [])
    .map(refOf)
    .filter((r): r is ApprovalRef => r !== null);
  const skipped = (Array.isArray(result.skipped) ? result.skipped : []).flatMap((s) => {
    const ref = refOf(s);
    if (!ref) return [];
    const reason = typeof s.reason === "string" && s.reason.trim() ? s.reason : "Not approved.";
    return [{ ...ref, reason }];
  });
  return { approved, skipped };
}
