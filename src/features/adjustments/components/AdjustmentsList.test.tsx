import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AdjustmentsList } from "./AdjustmentsList";
import * as api from "@/features/adjustments/api/adjustments";
import type { FocusAdjustmentView } from "@/features/adjustments/types";

jest.mock("@/features/adjustments/api/adjustments", () => ({
  voidAdjustment: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const view = (over: Partial<FocusAdjustmentView> = {}): FocusAdjustmentView => ({
  id: "a1",
  userId: "asha",
  userName: "Asha Rao",
  companyName: "RhythmRx",
  date: "2026-11-02",
  deltaSec: 1800,
  label: "+30 min",
  reason: "Agent missed Start Day until 10:00",
  createdById: "sm",
  createdByName: "Sara Menon",
  createdAt: "2026-11-03T09:30:00.000Z",
  voidedAt: null,
  voidedByName: null,
  ...over,
});

function renderList(props: Partial<Parameters<typeof AdjustmentsList>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdjustmentsList items={[view()]} canVoid={false} showOrg={false} {...props} />
    </QueryClientProvider>,
  );
}

describe("AdjustmentsList (3.3)", () => {
  it("shows who, how much, why and by whom; read-only without the right to undo", () => {
    renderList();
    expect(screen.getAllByText("+30 min").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agent missed Start Day until 10:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sara Menon/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /undo/i })).toBeNull();
  });

  it("names the organisation only when several are in view", () => {
    renderList();
    expect(screen.queryByText("RhythmRx")).toBeNull();
    renderList({ showOrg: true });
    expect(screen.getAllByText("RhythmRx").length).toBeGreaterThan(0);
  });

  it("lets the Super Manager undo a live one, never an undone one", async () => {
    (api.voidAdjustment as jest.Mock).mockResolvedValue(
      view({ voidedAt: "2026-11-03T10:00:00.000Z", voidedByName: "Sara Menon" }),
    );
    renderList({
      canVoid: true,
      items: [view(), view({ id: "a2", voidedAt: "2026-11-03T10:00:00.000Z", label: "+15 min" })],
    });
    const buttons = screen.getAllByRole("button", { name: /undo/i });
    // One live adjustment: its button on the phone list and in the table.
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^undo$/i }));
    await waitFor(() => expect(api.voidAdjustment).toHaveBeenCalled());
    expect((api.voidAdjustment as jest.Mock).mock.calls[0][0]).toBe("a1");
  });

  it("says so when there is nothing", () => {
    renderList({ items: [], emptyTitle: "No adjustments in November 2026" });
    expect(screen.getByText("No adjustments in November 2026")).toBeTruthy();
  });
});
