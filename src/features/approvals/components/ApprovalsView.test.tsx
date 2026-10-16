import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApprovalsView } from "./ApprovalsView";
import * as api from "@/features/approvals/api/approvals";
import type { ApprovalItemView, GetApprovalsParams } from "@/features/approvals/types";

jest.mock("@/features/approvals/api/approvals", () => ({
  BULK_APPROVE_MAX: 200,
  approveItem: jest.fn(),
  rejectItem: jest.fn(),
  reopenItem: jest.fn(),
  bulkApprove: jest.fn(),
  getApprovals: jest.fn(),
  getApprovalsSummary: jest.fn(),
  getMyApprovals: jest.fn(),
}));
jest.mock("@/features/reports/hooks/useReports", () => ({
  useReportPeople: () => ({ data: [] }),
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

const mocked = api as jest.Mocked<typeof api>;

function item(id: string): ApprovalItemView {
  return {
    type: "BREAK",
    id,
    category: "BREAK_SKIP",
    user: { id: `u-${id}`, name: `Person ${id}`, email: "", role: "USER", department: null },
    date: "2026-09-30",
    title: `Morning break skipped ${id}`,
    detail: "",
    reason: "On a call",
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
  };
}

const meta = (page: number, total: number) => ({
  page,
  limit: 50,
  total,
  totalPages: Math.max(1, Math.ceil(total / 50)),
});

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ApprovalsView isSuperAdmin={false} myId="me-1" myName="Arjun Mehta" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getApprovalsSummary.mockResolvedValue({
    pending: 51,
    dueSoon: 0,
    overdue: 0,
    escalated: 0,
    approvedToday: 0,
    rejectedToday: 0,
    slaHours: 48,
  });
});

describe("ApprovalsView paging", () => {
  it("moves from a page that no longer exists to the last one, instead of 'All caught up'", async () => {
    const user = userEvent.setup();
    let firstPageReads = 0;
    mocked.getApprovals.mockImplementation(async (params?: GetApprovalsParams) => {
      if (params?.page === 2) {
        // Someone decided the 51st item meanwhile: one page left.
        return { items: [], meta: meta(2, 50) };
      }
      firstPageReads += 1;
      return firstPageReads === 1
        ? { items: [item("a"), item("b")], meta: meta(1, 51) }
        : { items: [item("a")], meta: meta(1, 50) };
    });
    renderView();

    await user.click(await screen.findByRole("button", { name: "Next page" }));
    await waitFor(() => expect(firstPageReads).toBe(2));
    expect(mocked.getApprovals.mock.calls.map(([p]) => p?.page)).toEqual([1, 2, 1]);
    expect(await screen.findByRole("article", { name: "Morning break skipped a" })).toBeVisible();
    expect(screen.queryByText("All caught up")).not.toBeInTheDocument();
  });

  it("keeps the pager under an empty page, so it can be left", async () => {
    const user = userEvent.setup();
    mocked.getApprovals.mockImplementation(async (params?: GetApprovalsParams) =>
      params?.page === 2
        ? { items: [], meta: meta(2, 51) }
        : { items: [item("a")], meta: meta(1, 51) },
    );
    renderView();

    await user.click(await screen.findByRole("button", { name: "Next page" }));
    expect(await screen.findByText("All caught up")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(await screen.findByRole("article", { name: "Morning break skipped a" })).toBeVisible();
  });
});
