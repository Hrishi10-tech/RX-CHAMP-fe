"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { approvalKeys } from "@/features/approvals/api/keys";
import {
  approveItem,
  bulkApprove,
  getApprovals,
  getApprovalsSummary,
  rejectItem,
  reopenItem,
  type ApprovalsPage,
} from "@/features/approvals/api/approvals";
import { fallbackEffectText } from "@/features/approvals/lib/labels";
import type {
  ApprovalItemStatus,
  ApprovalItemView,
  ApprovalRef,
  BulkApproveResult,
  GetApprovalsParams,
} from "@/features/approvals/types";
import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { workdayKeys } from "@/features/workday/api/keys";
import { reportKeys } from "@/features/reports/api/keys";

export function useApprovalsList(
  params: GetApprovalsParams,
  isSuperAdmin: boolean,
  enabled = true,
) {
  return useQuery({
    queryKey: approvalKeys.list({ ...params, scope: isSuperAdmin ? params.scope : undefined }),
    queryFn: () => getApprovals(params, isSuperAdmin),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

/**
 * Counts behind the Approvals badge and the summary strip. Polled once a minute
 * and on focus; a new request (notification) refreshes it at once.
 */
export function useApprovalsSummary(enabled: boolean) {
  return useQuery({
    queryKey: approvalKeys.summary(),
    queryFn: getApprovalsSummary,
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

function sameRef(item: Pick<ApprovalItemView, "type" | "id">, ref: ApprovalRef): boolean {
  return item.type === ref.type && item.id === ref.id;
}

/** Who is deciding, for the optimistic copy of a row (the server's answer replaces it). */
export interface Decider {
  id?: string;
  name?: string;
}

/**
 * One row of one cached list as it was before an optimistic change, and the
 * copy put in its place (tagged with its own `optimistic` token). A failure puts
 * back only that row, and only while the list still shows that copy: a second
 * decision on another row, or a fresher read of the list, is never undone by
 * this one failing. (A token rather than object identity: the query cache copies
 * changed rows when it stores them.)
 */
export interface RowSwap {
  key: QueryKey;
  before: ApprovalItemView;
  after: ApprovalItemView;
}

let optimisticSeq = 0;

interface Context {
  swaps: RowSwap[];
}

/** Changes the cached copy of some rows in every list, in place. */
function patchLists(
  queryClient: QueryClient,
  change: (item: ApprovalItemView) => ApprovalItemView,
): void {
  queryClient.setQueriesData<ApprovalsPage>({ queryKey: approvalKeys.lists() }, (old) =>
    old ? { ...old, items: old.items.map(change) } : old,
  );
}

/**
 * Stops in-flight list reads (they would overwrite the optimistic rows with
 * stale ones), then swaps the rows of `refs` in every cached list for `change`'s
 * copy, remembering each swap so it can be undone on its own.
 */
export async function applyOptimistic(
  queryClient: QueryClient,
  refs: ApprovalRef[],
  change: (item: ApprovalItemView) => ApprovalItemView,
): Promise<RowSwap[]> {
  await queryClient.cancelQueries({ queryKey: approvalKeys.lists() });
  const token = `optimistic-${++optimisticSeq}`;
  const swaps: RowSwap[] = [];
  for (const [key, page] of queryClient.getQueriesData<ApprovalsPage>({
    queryKey: approvalKeys.lists(),
  })) {
    if (!page) continue;
    let changed = false;
    const items = page.items.map((item) => {
      if (!refs.some((r) => sameRef(item, r))) return item;
      const after = { ...change(item), optimistic: token };
      swaps.push({ key, before: item, after });
      changed = true;
      return after;
    });
    if (changed) queryClient.setQueryData<ApprovalsPage>(key, { ...page, items });
  }
  return swaps;
}

/** Puts back the rows of these swaps that still show their optimistic copy. */
export function rollbackRows(queryClient: QueryClient, swaps: RowSwap[] | undefined): void {
  for (const swap of swaps ?? []) {
    const isOurs = (i: ApprovalItemView) =>
      i.optimistic !== undefined &&
      i.optimistic === swap.after.optimistic &&
      sameRef(i, swap.after);
    queryClient.setQueryData<ApprovalsPage>(swap.key, (old) =>
      old && old.items.some(isOurs)
        ? { ...old, items: old.items.map((i) => (isOurs(i) ? swap.before : i)) }
        : old,
    );
  }
}

/**
 * After any decision: the badge, Team today and the person's focus time move,
 * so they are re-read now. The lists are only marked stale: a decided row stays
 * where it was (showing its new state, with Reopen) instead of vanishing under
 * the cursor, and goes at the next poll or visit.
 */
function refreshAfterDecision(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: approvalKeys.lists(), refetchType: "none" });
  void queryClient.invalidateQueries({ queryKey: approvalKeys.summary() });
  void queryClient.invalidateQueries({ queryKey: [...approvalKeys.all, "me"] });
  void queryClient.invalidateQueries({ queryKey: teamTodayKeys.all });
  void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
  void queryClient.invalidateQueries({ queryKey: reportKeys.all });
  // The 3.0 break views read the same records.
  void queryClient.invalidateQueries({ queryKey: ["breaks"] });
}

/**
 * After a failed decision, whatever the cause (a conflict, a 403, the network
 * dropping, a proxy's 502 page): undo this decision's rows, then re-read the
 * lists and counts at once, so the page shows what the server really has.
 */
function recoverFromFailure(queryClient: QueryClient, swaps: RowSwap[] | undefined): void {
  rollbackRows(queryClient, swaps);
  void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
}

/** The row as it will look once decided, before the server confirms. */
export function decidedCopy(
  item: ApprovalItemView,
  status: Exclude<ApprovalItemStatus, "PENDING">,
  note: string | undefined,
  me: Decider | undefined,
): ApprovalItemView {
  return {
    ...item,
    status,
    decidedAt: new Date().toISOString(),
    decidedById: me?.id ?? item.decidedById ?? null,
    decidedByName: me?.name ?? item.decidedByName,
    decisionNote: note?.trim() || null,
    dueSoon: false,
    overdue: false,
    effect: { ...item.effect, text: fallbackEffectText(item.effect, status) },
  };
}

/** The row as it will look back in pending, before the server confirms. */
export function reopenedCopy(item: ApprovalItemView): ApprovalItemView {
  return {
    ...item,
    status: "PENDING",
    decidedAt: null,
    decidedById: null,
    decidedByName: null,
    decisionNote: null,
    // The server restarts the clock; show no due time until it says what it is.
    dueAt: null,
    dueInSec: null,
    escalated: false,
    effect: { ...item.effect, text: fallbackEffectText(item.effect, "PENDING") },
  };
}

interface DecideVars {
  ref: ApprovalRef;
  note?: string;
}

export function useApproveItem(me?: Decider) {
  const queryClient = useQueryClient();
  return useMutation<ApprovalItemView, unknown, DecideVars, Context>({
    mutationFn: ({ ref, note }) => approveItem(ref, note),
    onMutate: async ({ ref, note }) => ({
      swaps: await applyOptimistic(queryClient, [ref], (i) => decidedCopy(i, "APPROVED", note, me)),
    }),
    onError: (_err, _vars, ctx) => recoverFromFailure(queryClient, ctx?.swaps),
    onSuccess: (item, { ref }) => patchLists(queryClient, (i) => (sameRef(i, ref) ? item : i)),
    onSettled: () => refreshAfterDecision(queryClient),
  });
}

export function useRejectItem(me?: Decider) {
  const queryClient = useQueryClient();
  return useMutation<ApprovalItemView, unknown, Required<DecideVars>, Context>({
    mutationFn: ({ ref, note }) => rejectItem(ref, note),
    onMutate: async ({ ref, note }) => ({
      swaps: await applyOptimistic(queryClient, [ref], (i) => decidedCopy(i, "REJECTED", note, me)),
    }),
    onError: (_err, _vars, ctx) => recoverFromFailure(queryClient, ctx?.swaps),
    onSuccess: (item, { ref }) => patchLists(queryClient, (i) => (sameRef(i, ref) ? item : i)),
    onSettled: () => refreshAfterDecision(queryClient),
  });
}

export function useReopenItem() {
  const queryClient = useQueryClient();
  return useMutation<ApprovalItemView, unknown, { ref: ApprovalRef }, Context>({
    mutationFn: ({ ref }) => reopenItem(ref),
    onMutate: async ({ ref }) => ({
      swaps: await applyOptimistic(queryClient, [ref], reopenedCopy),
    }),
    onError: (_err, _vars, ctx) => recoverFromFailure(queryClient, ctx?.swaps),
    onSuccess: (item, { ref }) => patchLists(queryClient, (i) => (sameRef(i, ref) ? item : i)),
    onSettled: () => refreshAfterDecision(queryClient),
  });
}

/**
 * Bulk approve. Rows show as approved at once; the ones the server skipped go
 * back to how they were, and every list is re-read, since only ids come back.
 */
export function useBulkApprove(me?: Decider) {
  const queryClient = useQueryClient();
  return useMutation<BulkApproveResult, unknown, { refs: ApprovalRef[]; note?: string }, Context>({
    mutationFn: ({ refs, note }) => bulkApprove(refs, note),
    onMutate: async ({ refs, note }) => ({
      swaps: await applyOptimistic(queryClient, refs, (i) => decidedCopy(i, "APPROVED", note, me)),
    }),
    onError: (_err, _vars, ctx) => recoverFromFailure(queryClient, ctx?.swaps),
    onSuccess: (result, _vars, ctx) => {
      // Put the skipped rows back exactly as they were before the click.
      rollbackRows(
        queryClient,
        ctx?.swaps.filter((s) => result.skipped.some((k) => sameRef(s.before, k))),
      );
    },
    onSettled: () => {
      refreshAfterDecision(queryClient);
      void queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
    },
  });
}

/** After a conflict (someone else decided first), re-read everything. */
export function useRefreshApprovals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: approvalKeys.all });
}
