import { render, screen, within } from "@testing-library/react";

import { BalancesPanel } from "./BalancesPanel";

const pool = {
  grantedDays: 12,
  carriedDays: 0,
  adjustedDays: 0,
  takenDays: 0,
  pendingDays: 0,
  availableDays: 12,
};
const row = {
  user: { id: "u1", name: "Asha Rao", department: "Billing", companyName: null, avatarId: null },
  clsl: pool,
  elpl: pool,
  compOff: null,
  quota: { clslDaysPerYear: null, elplDaysPerYear: null },
  upcomingDays: 0,
};

// 4.0 draws each person with their avatar, which reads the avatar library.
jest.mock("@/components/avatar/PersonAvatar", () => ({ PersonAvatar: () => null }));
jest.mock("@/features/organisations/hooks/useOrgsInView", () => ({
  useOrgsInView: () => ({ canChoose: false, org: null, mixed: false }),
}));
jest.mock("@/features/leave/hooks/useLeave", () => ({
  useLeavePolicy: () => ({ data: null }),
  useLeaveBalances: () => ({
    data: { canAdjust: true, rows: [row] },
    isLoading: false,
    isError: false,
  }),
}));
jest.mock("./AdjustLeaveDialogs", () => ({
  AdjustLeaveDialog: () => null,
  PersonLeaveDialog: () => null,
  QuotaDialog: () => null,
}));

// W-38: one button per balance row (Open); Change balance and Yearly days are in its menu.
describe("Balances (W-38)", () => {
  it("draws one button per row for someone who may change balances", () => {
    render(<BalancesPanel />);
    const table = screen.getByRole("table");
    const tr = within(table).getAllByRole("row")[1];
    expect(within(tr).getByRole("button", { name: /Open/ })).toBeInTheDocument();
    expect(within(tr).queryByRole("button", { name: /^Change/ })).toBeNull();
    expect(within(tr).queryByRole("button", { name: /Yearly days/ })).toBeNull();
    expect(within(tr).getByRole("button", { name: "More for Asha Rao" })).toBeInTheDocument();
  });
});
