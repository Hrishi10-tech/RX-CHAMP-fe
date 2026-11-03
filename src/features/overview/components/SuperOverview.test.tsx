import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { issuesByOrg, SuperOverview } from "./SuperOverview";
import {
  getOrganisationsOverview,
  readOrganisationsOverview,
} from "@/features/overview/api/organisationsOverview";
import { selectOrg } from "@/lib/org/selection";
import type { AgentHealthRow } from "@/features/agentHealth/types";

const push = jest.fn();
let mixed = true;

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/lib/org/selection", () => ({ selectOrg: jest.fn() }));
jest.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "sm-1", name: "Sara Menon" }, role: "SUPER_MANAGER" }),
}));
jest.mock("@/features/organisations/hooks/useOrgsInView", () => ({
  useOrgsInView: () => ({
    canChoose: true,
    mixed,
    org: mixed ? null : { id: "org-a", name: "Acme" },
  }),
}));
jest.mock("@/features/agentHealth/hooks/useAgentHealth", () => ({
  useAgentHealth: () => ({
    isLoading: false,
    isError: false,
    data: {
      summary: { people: 5 },
      rows: [
        {
          userId: "u-b1",
          name: "Bea Rao",
          department: "Sales",
          companyId: "org-b",
          companyName: "Beta",
          flags: ["AGENT_OFFLINE"],
        },
      ],
    },
  }),
}));
jest.mock("@/features/overview/api/organisationsOverview", () => {
  const actual = jest.requireActual("@/features/overview/api/organisationsOverview");
  return { ...actual, getOrganisationsOverview: jest.fn() };
});

const today = (people: number, started: number) => ({
  people,
  started,
  working: started,
  onBreak: 0,
  inMeeting: 0,
  away: 0,
  notStarted: people - started,
  ended: 0,
  lateStarts: 0,
  focusSec: 3600,
  targetSec: 0,
  noAgent: 0,
});

const RAW = {
  scope: { organisation: null, combined: true },
  totals: { ...today(5, 3), pendingApprovals: 3, overdueApprovals: 1 },
  organisations: [
    { id: "org-a", name: "Acme", today: today(3, 2), approvals: { pending: 2, overdue: 1 } },
    { id: "org-b", name: "Beta", today: today(2, 1), approvals: { pending: 1, overdue: 0 } },
  ],
  waiting: {
    total: 3,
    items: [
      {
        type: "BREAK",
        id: "b1",
        title: "Morning break skipped",
        date: "2026-11-03",
        overdue: true,
        status: "PENDING",
        effect: { mode: "MINUS", minutes: 15, text: "−15 min if rejected" },
        user: { id: "u-b1", name: "Bea Rao", companyId: "org-b", companyName: "Beta" },
      },
    ],
  },
  generatedAt: "2026-11-03T06:00:00.000Z",
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SuperOverview />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mixed = true;
  (getOrganisationsOverview as jest.Mock).mockResolvedValue(readOrganisationsOverview(RAW));
});

describe("SuperOverview (3.3)", () => {
  it("shows one card per organisation, with its agent issues, on All organisations", async () => {
    renderPage();
    const acme = await screen.findByRole("region", { name: "Acme" });
    expect(within(acme).getByText("2 of 3")).toBeVisible();
    expect(within(acme).getByText("1 overdue")).toBeVisible();
    const beta = screen.getByRole("region", { name: "Beta" });
    expect(within(beta).getByText("1 agent issue")).toBeVisible();
    expect(screen.getByText("Every organisation", { exact: false })).toBeVisible();
  });

  it("a quick link picks the organisation, then opens the page", async () => {
    const user = userEvent.setup();
    renderPage();
    const beta = await screen.findByRole("region", { name: "Beta" });
    await user.click(within(beta).getByRole("button", { name: "Approvals" }));
    expect(selectOrg).toHaveBeenCalledWith({ id: "org-b", name: "Beta" });
    expect(push).toHaveBeenCalledWith("/dashboard/approvals");
  });

  it("lists what waits for a decision, with the organisation named", async () => {
    renderPage();
    const waiting = await screen.findByRole("region", { name: "Waiting for a decision" });
    expect(within(waiting).getByText("Bea Rao")).toBeVisible();
    expect(within(waiting).getByTitle("Organisation: Beta")).toBeVisible();
    expect(within(waiting).getByText("and 2 more on Approvals")).toBeVisible();
  });

  it("drops the cards and chips once one organisation is picked", async () => {
    mixed = false;
    renderPage();
    await screen.findByRole("region", { name: "Waiting for a decision" });
    expect(screen.queryByRole("region", { name: "Acme" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Organisation: Beta")).not.toBeInTheDocument();
  });
});

describe("issuesByOrg / readOrganisationsOverview", () => {
  it("counts flagged people per organisation", () => {
    const rows = [
      { companyId: "a", flags: ["AGENT_OFFLINE"] },
      { companyId: "a", flags: ["OLD_AGENT"] },
      { companyId: "b", flags: [] },
      { companyId: null, flags: ["AGENT_OFFLINE"] },
    ] as unknown as AgentHealthRow[];
    expect([...issuesByOrg(rows)]).toEqual([["a", 2]]);
  });

  it("reads a partial answer without inventing anything", () => {
    const v = readOrganisationsOverview({ organisations: [{ id: "x" }, { name: "no id" }] });
    expect(v.organisation).toBeNull();
    expect(v.organisations).toHaveLength(1);
    expect(v.organisations[0].today.people).toBe(0);
    expect(v.waiting).toEqual({ items: [], total: 0 });
  });
});
