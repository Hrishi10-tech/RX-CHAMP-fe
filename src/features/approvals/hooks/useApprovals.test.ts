import { QueryClient } from "@tanstack/react-query";

import { approvalKeys } from "@/features/approvals/api/keys";
import type { ApprovalsPage } from "@/features/approvals/api/approvals";
import type { ApprovalItemView } from "@/features/approvals/types";
import { applyOptimistic, decidedCopy, reopenedCopy, rollbackRows } from "./useApprovals";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  refreshAccessToken: jest.fn(),
}));

function item(id: string, patch: Partial<ApprovalItemView> = {}): ApprovalItemView {
  return {
    type: "BREAK",
    id,
    category: "BREAK_SKIP",
    user: { id: `u-${id}`, name: `Person ${id}`, email: "", role: "USER", department: null },
    date: "2026-09-30",
    title: "Morning break skipped",
    detail: "",
    reason: null,
    needsComment: false,
    participants: [],
    startedAt: "2026-09-30T05:31:00.000Z",
    endedAt: null,
    inProgress: false,
    durationSec: 0,
    effect: { mode: "MINUS", minutes: 15, text: "−15 min if rejected" },
    status: "PENDING",
    createdAt: "2026-09-30T05:31:00.000Z",
    dueAt: "2026-10-16T05:38:00.000Z",
    dueInSec: 3600,
    dueSoon: false,
    overdue: false,
    escalated: false,
    decidedAt: null,
    decidedById: null,
    decidedByName: null,
    decisionNote: null,
    canDecide: true,
    locked: false,
    break: null,
    meeting: null,
    receivedAt: 1_000,
    ...patch,
  };
}

const key = approvalKeys.list({ status: "PENDING" });
const me = { id: "me-1", name: "Arjun Mehta" };
const rows = (client: QueryClient) => client.getQueryData<ApprovalsPage>(key)?.items ?? [];

describe("optimistic decisions, undone row by row", () => {
  it("a failure puts back only its own row, never another decision in flight", async () => {
    const client = new QueryClient();
    client.setQueryData<ApprovalsPage>(key, { items: [item("a"), item("b")] });

    await applyOptimistic(client, [{ type: "BREAK", id: "a" }], (i) =>
      decidedCopy(i, "APPROVED", undefined, me),
    );
    const swapsB = await applyOptimistic(client, [{ type: "BREAK", id: "b" }], (i) =>
      decidedCopy(i, "APPROVED", undefined, me),
    );
    expect(rows(client).map((i) => i.status)).toEqual(["APPROVED", "APPROVED"]);

    rollbackRows(client, swapsB); // b failed
    expect(rows(client).map((i) => i.status)).toEqual(["APPROVED", "PENDING"]);
  });

  it("leaves a row alone once a fresher read has replaced the optimistic copy", async () => {
    const client = new QueryClient();
    client.setQueryData<ApprovalsPage>(key, { items: [item("a")] });
    const swaps = await applyOptimistic(client, [{ type: "BREAK", id: "a" }], (i) =>
      decidedCopy(i, "REJECTED", "Take your break", me),
    );
    const fromServer = item("a", { status: "REJECTED", decidedByName: "Kavya Menon" });
    client.setQueryData<ApprovalsPage>(key, { items: [fromServer] });

    rollbackRows(client, swaps);
    expect(rows(client)[0]).toEqual(fromServer);
  });

  it("records who decided, and keeps the moment the row arrived for its clocks", () => {
    const copy = decidedCopy(item("a"), "APPROVED", " fine ", me);
    expect(copy).toMatchObject({
      status: "APPROVED",
      decidedById: "me-1",
      decidedByName: "Arjun Mehta",
      decisionNote: "fine",
      receivedAt: 1_000,
    });
    expect(reopenedCopy(copy)).toMatchObject({
      status: "PENDING",
      decidedById: null,
      decidedByName: null,
      dueInSec: null,
    });
  });
});
