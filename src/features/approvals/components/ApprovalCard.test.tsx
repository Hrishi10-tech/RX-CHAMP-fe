import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosResponse } from "axios";

import { ApprovalCard } from "./ApprovalCard";
import { approvalKeys } from "@/features/approvals/api/keys";
import type { ApprovalItemView } from "@/features/approvals/types";
import * as api from "@/features/approvals/api/approvals";

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

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const mocked = api as jest.Mocked<typeof api>;

function makeItem(patch: Partial<ApprovalItemView> = {}): ApprovalItemView {
  return {
    type: "BREAK",
    id: "b-1",
    category: "BREAK_SKIP",
    user: {
      id: "u-1",
      name: "Asha Kumar",
      email: "asha@example.com",
      role: "USER",
      department: "Engineering",
    },
    date: "2026-10-13",
    title: "Morning break skipped",
    detail: "Skipped at 10:59 · window 10:30 to 12:00",
    reason: "On a customer call until 11:40",
    needsComment: false,
    participants: [],
    startedAt: "2026-10-13T05:29:00.000Z",
    endedAt: null,
    inProgress: false,
    durationSec: 0,
    effect: { mode: "MINUS", minutes: 15, text: "−15 min if rejected" },
    status: "PENDING",
    createdAt: "2026-10-13T05:29:00.000Z",
    dueAt: "2026-10-15T05:29:00.000Z",
    dueInSec: 31 * 3600,
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
    ...patch,
  };
}

function conflict(code: string, status = 409, message = "Someone was quicker"): AxiosError {
  const response = {
    status,
    statusText: "",
    headers: {},
    config: {},
    data: { success: false, message, error: { code, message } },
  } as unknown as AxiosResponse;
  return new AxiosError(message, "ERR_BAD_REQUEST", undefined, null, response);
}

/** Reads the row from the query cache, like the page does, so optimistic changes show. */
function Row({ initial, read }: { initial: ApprovalItemView; read: jest.Mock }) {
  const { data } = useQuery({
    queryKey: approvalKeys.list({ status: "PENDING" }),
    queryFn: async () => {
      read();
      return { items: [initial] };
    },
    initialData: { items: [initial] },
    staleTime: Number.POSITIVE_INFINITY,
  });
  return (
    <ApprovalCard
      item={data.items[0]}
      fetchedAt={Date.now()}
      selected={false}
      onToggle={() => undefined}
      gutter
      canReopen
      me={{ id: "me-1", name: "Maya Reddy" }}
    />
  );
}

function renderRow(item: ApprovalItemView) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  const read = jest.fn();
  render(
    <QueryClientProvider client={client}>
      <Row initial={item} read={read} />
    </QueryClientProvider>,
  );
  return { user, client, read };
}

/** What axios throws when the connection drops: no response, no code. */
function networkDown(): AxiosError {
  return new AxiosError("Network Error", "ERR_NETWORK");
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ApprovalCard", () => {
  it("shows who, what, the reason, the effect and the time left", () => {
    renderRow(makeItem());
    const row = screen.getByRole("article", { name: "Morning break skipped" });
    expect(within(row).getByText("Asha Kumar")).toBeInTheDocument();
    expect(within(row).getByText("Skipped")).toBeInTheDocument();
    expect(within(row).getByText("“On a customer call until 11:40”")).toBeInTheDocument();
    expect(within(row).getByText("−15 min if rejected")).toBeInTheDocument();
    expect(within(row).getByText("Due in 31h")).toBeInTheDocument();
  });

  it("approves in one click, showing the decision before the server answers", async () => {
    let resolve: (item: ApprovalItemView) => void = () => undefined;
    mocked.approveItem.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user } = renderRow(makeItem());

    await user.click(screen.getByRole("button", { name: /^Approve Asha Kumar/ }));

    expect(mocked.approveItem).toHaveBeenCalledWith({ type: "BREAK", id: "b-1" }, undefined);
    // Optimistic: approved at once, no buttons left to double-click.
    expect(await screen.findByText(/^Approved by Maya Reddy at/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Approve Asha Kumar/ })).not.toBeInTheDocument();

    resolve(
      makeItem({
        status: "APPROVED",
        decidedByName: "Maya Reddy",
        decidedAt: new Date().toISOString(),
        effect: { mode: "MINUS", minutes: 15, text: "Counted as focus time" },
      }),
    );
    expect(await screen.findByText("Counted as focus time")).toBeInTheDocument();
  });

  it("puts the row back when the server refuses", async () => {
    mocked.approveItem.mockRejectedValue(conflict("ALREADY_DECIDED"));
    const { user } = renderRow(makeItem());

    await user.click(screen.getByRole("button", { name: /^Approve Asha Kumar/ }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Approve Asha Kumar/ })).toBeInTheDocument(),
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
    const { toast } = jest.requireMock("sonner") as { toast: { info: jest.Mock } };
    expect(toast.info).toHaveBeenCalledWith("This item changed meanwhile", expect.anything());
  });

  it("sends one decision when Approve is clicked twice before it re-renders", async () => {
    mocked.approveItem.mockReturnValue(new Promise(() => undefined));
    renderRow(makeItem());
    const button = screen.getByRole("button", { name: /^Approve Asha Kumar/ });

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(mocked.approveItem).toHaveBeenCalledTimes(1));
  });

  it("re-reads the list after a failure with no error code (the network dropped)", async () => {
    mocked.approveItem.mockRejectedValue(networkDown());
    const { user, read } = renderRow(makeItem());

    await user.click(screen.getByRole("button", { name: /^Approve Asha Kumar/ }));

    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: /^Approve Asha Kumar/ })).toBeInTheDocument();
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
    expect(toast.error).toHaveBeenCalledWith("Couldn't approve", expect.anything());
  });

  it("calls an ended live meeting a Meeting, not a Live meeting", () => {
    renderRow(
      makeItem({
        type: "MEETING",
        id: "m-2",
        category: "MEETING_LIVE",
        title: "Meeting: Client escalation",
        inProgress: false,
        endedAt: "2026-09-29T06:30:00.000Z",
      }),
    );
    expect(screen.getByText("Meeting")).toBeInTheDocument();
    expect(screen.queryByText("Live meeting")).not.toBeInTheDocument();
  });

  it("asks for a note of 3 or more characters before rejecting", async () => {
    mocked.rejectItem.mockResolvedValue(
      makeItem({
        status: "REJECTED",
        decidedByName: "Maya Reddy",
        decidedAt: new Date().toISOString(),
        decisionNote: "Please take your break",
        effect: { mode: "MINUS", minutes: 15, text: "−15 min taken off" },
      }),
    );
    const { user } = renderRow(makeItem());

    await user.click(screen.getByRole("button", { name: /^Reject Asha Kumar/ }));
    const box = screen.getByLabelText(/Why are you rejecting it\? Asha sees this note/);
    expect(box).toHaveFocus();
    expect(screen.getByText("Rejecting takes 15 min off focus time.")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Reject" });
    expect(submit).toBeDisabled();
    await user.type(box, "ok");
    expect(submit).toBeDisabled();
    expect(mocked.rejectItem).not.toHaveBeenCalled();

    await user.type(box, " Please take your break");
    expect(submit).toBeEnabled();
    await user.clear(box);
    await user.type(box, "Please take your break");
    await user.click(submit);

    expect(mocked.rejectItem).toHaveBeenCalledWith(
      { type: "BREAK", id: "b-1" },
      "Please take your break",
    );
    expect(await screen.findByText("−15 min taken off")).toBeInTheDocument();
    expect(screen.getByText(/Note: Please take your break/)).toBeInTheDocument();
  });

  it("shows the server's reason when it still wants a note", async () => {
    mocked.rejectItem.mockRejectedValue(
      conflict("NOTE_REQUIRED", 400, "Say why you are rejecting it."),
    );
    const { user } = renderRow(makeItem());

    await user.click(screen.getByRole("button", { name: /^Reject Asha Kumar/ }));
    await user.type(screen.getByRole("textbox"), "   no");
    await user.type(screen.getByRole("textbox"), "pe");
    await user.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Say why you are rejecting it.")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("approves with an optional note", async () => {
    mocked.approveItem.mockResolvedValue(makeItem({ status: "APPROVED" }));
    const { user } = renderRow(makeItem());

    await user.click(screen.getByRole("button", { name: /^Approve with a note: Asha Kumar/ }));
    await user.type(screen.getByLabelText("Note for Asha (optional)"), "Fine this time");
    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(mocked.approveItem).toHaveBeenCalledWith({ type: "BREAK", id: "b-1" }, "Fine this time");
  });

  it("shows a live meeting with a running timer and no buttons", () => {
    renderRow(
      makeItem({
        type: "MEETING",
        id: "m-1",
        category: "MEETING_LIVE",
        title: "Meeting: Sprint review",
        reason: "Sprint review",
        inProgress: true,
        durationSec: 24 * 60 + 5,
        canDecide: false,
        participants: [{ name: "Divya K" }, { id: "u-9", name: "Vikram" }],
      }),
    );
    expect(screen.getByRole("timer")).toHaveTextContent("Live · 24:05");
    expect(screen.getByText("Live meeting")).toBeInTheDocument();
    expect(screen.getByText(/The meeting is still running/)).toBeInTheDocument();
    expect(screen.getByText("With Divya K, Vikram")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reject/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps an item in a locked month read-only", () => {
    renderRow(makeItem({ date: "2026-09-30", locked: true }));
    expect(screen.getByText("Locked for payroll")).toBeInTheDocument();
    expect(screen.getByText(/September 2026 is locked for payroll/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("says No comment yet for an auto-skip still waiting for one", () => {
    renderRow(makeItem({ category: "BREAK_AUTO_SKIP", reason: null, needsComment: true }));
    expect(screen.getByText("No comment yet")).toBeInTheDocument();
    expect(screen.getByText(/Asha adds a comment in the desktop app/)).toBeInTheDocument();
    // Deciding without the comment is allowed.
    expect(screen.getByRole("button", { name: /^Approve Asha Kumar/ })).toBeEnabled();
  });

  it("reopens a decided item", async () => {
    mocked.reopenItem.mockResolvedValue(makeItem());
    const { user } = renderRow(
      makeItem({
        status: "APPROVED",
        decidedByName: "Maya Reddy",
        decidedAt: new Date().toISOString(),
        dueInSec: null,
      }),
    );
    await user.click(screen.getByRole("button", { name: /^Reopen Asha Kumar/ }));
    expect(mocked.reopenItem).toHaveBeenCalledWith({ type: "BREAK", id: "b-1" });
    expect(await screen.findByRole("button", { name: /^Approve Asha Kumar/ })).toBeInTheDocument();
  });
});
