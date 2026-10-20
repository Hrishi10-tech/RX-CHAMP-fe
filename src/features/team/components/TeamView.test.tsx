import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TeamView } from "./TeamView";
import * as api from "@/features/team/api/team";
import { readTeamPerson } from "@/features/team/api/team";
import type { TeamPerson } from "@/features/team/types";

jest.mock("@/features/team/api/team", () => ({
  ...jest.requireActual("@/features/team/api/team"),
  getTeam: jest.fn(),
}));
jest.mock("@/features/presence/hooks/usePresenceRefresh", () => ({
  usePresenceRefresh: jest.fn(),
}));

const mocked = api as jest.Mocked<typeof api>;

const base: Omit<TeamPerson, "id" | "name" | "status"> = {
  role: "USER",
  designation: null,
  department: { id: "d1", name: "Hardware", icon: "cpu" },
  since: "2026-10-19T03:35:00.000Z",
  startedAt: "2026-10-19T03:35:00.000Z",
  focusSec: 3 * 3600,
  targetSec: 7.5 * 3600,
  paidSec: 3 * 3600 + 20 * 60,
  unverifiedSec: 0,
  online: true,
  agentVersion: "4.0.0",
  lateStartMin: 0,
};

const people: TeamPerson[] = [
  { ...base, id: "u1", name: "Asha K", status: "WORKING", lateStartMin: 12 },
  { ...base, id: "u2", name: "Bala R", status: "NOT_STARTED", since: null, online: false },
  {
    ...base,
    id: "u3",
    name: "Chitra S",
    status: "BREAK",
    department: { id: "d2", name: "Sales", icon: "bar-chart" },
    unverifiedSec: 25 * 60,
  },
];

function renderTeam() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeamView />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocked.getTeam.mockResolvedValue({
    date: "2026-10-19",
    counts: {
      all: 3,
      active: 2,
      working: 1,
      onBreak: 1,
      inMeeting: 0,
      away: 0,
      notStarted: 1,
      ended: 0,
    },
    people,
  });
});

describe("TeamView", () => {
  it("asks for the whole team once and shows the active people first", async () => {
    renderTeam();
    const list = await screen.findByRole("list");
    expect(mocked.getTeam).toHaveBeenCalledTimes(1);
    expect(mocked.getTeam).toHaveBeenCalledWith({ view: "all" });
    expect(within(list).getByText("Asha K")).toBeInTheDocument();
    expect(within(list).getByText("Chitra S")).toBeInTheDocument();
    expect(within(list).queryByText("Bala R")).not.toBeInTheDocument();
    // 12-hour "since" in the business zone.
    expect(within(list).getAllByText("since 9:05 AM").length).toBeGreaterThan(0);
    // The server's late start is reported on the row.
    expect(within(list).getByText(/started 12m late/)).toBeInTheDocument();
  });

  it("shows everyone under All, with the counts on the tabs", async () => {
    renderTeam();
    await screen.findByRole("list");
    const all = screen.getByRole("tab", { name: /All/ });
    expect(all).toHaveTextContent("3");
    expect(screen.getByRole("tab", { name: /Active/ })).toHaveTextContent("2");
    await userEvent.click(all);
    expect(screen.getByText("Bala R")).toBeInTheDocument();
  });

  it("links each person to their productivity dashboard", async () => {
    renderTeam();
    const link = (await screen.findByText("Asha K")).closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/team/u1?name=Asha%20K");
  });

  it("shows paid time on every row and offline time only where there is some", async () => {
    renderTeam();
    const list = await screen.findByRole("list");
    expect(within(list).getAllByText("3h 20m")).toHaveLength(2);
    expect(within(list).getAllByText(/offline, no activity data/)).toHaveLength(1);
    expect(within(list).getByText("25m offline, no activity data")).toBeInTheDocument();
  });

  it("reads paid and offline time from GET /team, working paid time out when not sent", () => {
    const row = { id: "u9", name: "Delta", status: "working", focusSec: 3600 };
    expect(readTeamPerson({ ...row, paidSec: 4200, unverifiedSec: 900 })).toMatchObject({
      status: "WORKING",
      paidSec: 4200,
      unverifiedSec: 900,
    });
    expect(readTeamPerson(row)).toMatchObject({ paidSec: 3600, unverifiedSec: 0 });
  });

  it("filters by search", async () => {
    renderTeam();
    await screen.findByRole("list");
    await userEvent.type(screen.getByRole("searchbox", { name: "Search people" }), "chit");
    expect(screen.queryByText("Asha K")).not.toBeInTheDocument();
    expect(screen.getByText("Chitra S")).toBeInTheDocument();
  });
});
