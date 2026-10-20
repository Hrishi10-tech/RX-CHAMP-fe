import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders } from "axios";
import { render, screen, waitFor } from "@testing-library/react";

import { ProductivityDashboard } from "./ProductivityDashboard";
import * as analyticsApi from "@/features/analytics/api/getDashboardAnalytics";
import * as timesheetApi from "@/features/timesheet/api/timesheet";
import * as presenceApi from "@/features/productivity/api/getActivityTimeline";
import { ALL_GRANTS, NO_GRANTS } from "@/constants/roles";
import type { DashboardAnalytics } from "@/features/analytics/types";

jest.mock("@/features/analytics/api/getDashboardAnalytics", () => ({
  getDashboardAnalytics: jest.fn(),
}));
jest.mock("@/features/timesheet/api/timesheet", () => ({
  ...jest.requireActual("@/features/timesheet/api/timesheet"),
  getTimesheet: jest.fn(),
}));
jest.mock("@/features/analytics/hooks/useLiveStatus", () => ({
  useLiveStatus: () => ({
    status: null,
    connected: false,
    live: { activeSec: null, idleSec: null, topApps: null },
    current: null,
    presenceVersion: 0,
    presence: "WORKING",
  }),
}));
jest.mock("@/features/presence/hooks/usePresenceRefresh", () => ({
  usePresenceRefresh: jest.fn(),
}));
jest.mock("@/features/analytics/components/ScreenshotsWidget", () => ({
  ScreenshotsWidget: () => <div>SCREENSHOTS</div>,
}));
jest.mock("@/features/analytics/components/ActivityTimelineChart", () => ({
  ActivityTimelineChart: () => <div>TIMELINE CHART</div>,
  TIMELINE_LEGEND: [],
}));
jest.mock("@/features/analytics/components/TopAppsWidget", () => ({
  TopAppsWidget: () => <div>TOP APPS</div>,
}));
jest.mock("@/features/analytics/components/DailyFlowHeatmap", () => ({
  DailyFlowHeatmap: () => <div>DAILY FLOW</div>,
}));
jest.mock("@/features/analytics/components/FocusSessionsDonut", () => ({
  FocusSessionsDonut: () => null,
}));
jest.mock("@/features/analytics/components/WorkVsBreakDonut", () => ({
  WorkVsBreakDonut: () => null,
}));
jest.mock("@/features/analytics/components/FocusTimeTrend", () => ({ FocusTimeTrend: () => null }));
jest.mock("@/features/analytics/components/OnlineHoursChart", () => ({
  OnlineHoursChart: () => null,
}));
jest.mock("@/features/productivity/api/getActivityTimeline", () => ({
  getActivityTimeline: jest.fn(),
}));
jest.mock("@/features/productivity/components/PresenceTimelineChart", () => ({
  PresenceTimelineChart: () => <div>PRESENCE TIMELINE</div>,
  PRESENCE_SERIES: [],
}));

const getAnalytics = analyticsApi.getDashboardAnalytics as jest.Mock;
const getTimesheet = timesheetApi.getTimesheet as jest.Mock;

const ANALYTICS = {
  date: "2026-10-19",
  kpis: [
    { key: "active", label: "Active", value: "4h", deltaPct: null, spark: [] },
    { key: "idle", label: "Idle", value: "20m", deltaPct: null, spark: [] },
    { key: "break", label: "Break", value: "30m", deltaPct: null, spark: [] },
  ],
  timeline: [],
  topApps: [],
  dailyFlow: [],
} as unknown as DashboardAnalytics;

function renderDashboard(grants = ALL_GRANTS) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProductivityDashboard
        userId="u1"
        userName="Asha K"
        backHref="/dashboard/team"
        backLabel="Team"
        grants={grants}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getAnalytics.mockResolvedValue(ANALYTICS);
  (presenceApi.getActivityTimeline as jest.Mock).mockResolvedValue({
    date: "2026-10-19",
    buckets: [],
  });
  getTimesheet.mockResolvedValue({
    person: {
      id: "u1",
      name: "Asha K",
      email: null,
      designation: "Engineer",
      department: "Hardware",
      organisation: null,
    },
    range: { from: "2026-10-19", to: "2026-10-19" },
    rows: [
      {
        date: "2026-10-19",
        weekday: "Mon",
        isWorkingDay: true,
        label: null,
        in: { iso: "2026-10-19T03:35:00.000Z", text: "9:05 AM" },
        out: null,
        focusSec: 3 * 3600,
        targetSec: 27000,
        breakSec: 0,
        paidBreakSec: 0,
        unpaidBreakSec: 0,
        meetingsSec: 0,
        awayApprovedSec: 0,
        awayPendingSec: 0,
        status: "IN_PROGRESS",
      },
    ],
    totals: timesheetApi.totalsOf([]),
  });
});

describe("ProductivityDashboard: only what the viewer may see (SPEC 2.2)", () => {
  it("shows every section to an Admin", async () => {
    renderDashboard(ALL_GRANTS);
    expect(await screen.findByText("TIMELINE CHART")).toBeInTheDocument();
    expect(screen.getByText("TOP APPS")).toBeInTheDocument();
    expect(screen.getByText("SCREENSHOTS")).toBeInTheDocument();
    expect(screen.getByText("DAILY FLOW")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("In 9:05 AM")).toBeInTheDocument();
  });

  it("gives a screenshots-only manager screenshots and the day, and never asks for activity", async () => {
    renderDashboard({ ...NO_GRANTS, screenshots: true });
    expect(await screen.findByText("SCREENSHOTS")).toBeInTheDocument();
    await waitFor(() => expect(getTimesheet).toHaveBeenCalled());
    expect(getAnalytics).not.toHaveBeenCalled();
    expect(screen.queryByText("TIMELINE CHART")).not.toBeInTheDocument();
    expect(screen.queryByText("DAILY FLOW")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Ask your Admin for access to timelines, apps and sites/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ask your Admin for access to keyboard and mouse activity/),
    ).toBeInTheDocument();
  });

  it("gives a timeline manager the presence timeline and apps but no keyboard or mouse figures", async () => {
    renderDashboard({ ...NO_GRANTS, timeline: true });
    expect(await screen.findByText("PRESENCE TIMELINE")).toBeInTheDocument();
    expect(await screen.findByText("TOP APPS")).toBeInTheDocument();
    // The active/idle chart is keyboard and mouse activity (SPEC 1.2).
    expect(screen.queryByText("TIMELINE CHART")).not.toBeInTheDocument();
    expect(screen.getByText("Break")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Idle")).not.toBeInTheDocument();
    expect(screen.queryByText("DAILY FLOW")).not.toBeInTheDocument();
    expect(screen.queryByText("SCREENSHOTS")).not.toBeInTheDocument();
  });

  it("answers a 403 GRANT_REQUIRED with a line, not an error", async () => {
    const config = { headers: new AxiosHeaders() };
    getAnalytics.mockRejectedValue(
      new AxiosError("Forbidden", "403", config, null, {
        status: 403,
        statusText: "",
        headers: {},
        config,
        data: { success: false, error: { code: "GRANT_REQUIRED", message: "No access" } },
      }),
    );
    // A grant removed since the page loaded: the server's refusal is shown as a line.
    renderDashboard({ ...NO_GRANTS, activity: true });
    expect(
      await screen.findByText(/Ask your Admin for access to this person's activity/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load activity")).not.toBeInTheDocument();
  });

  it("shows the presence timeline to a timeline manager the analytics refuse", async () => {
    const config = { headers: new AxiosHeaders() };
    getAnalytics.mockRejectedValue(
      new AxiosError("Forbidden", "403", config, null, {
        status: 403,
        statusText: "",
        headers: {},
        config,
        data: { success: false, error: { code: "GRANT_REQUIRED", message: "No access" } },
      }),
    );
    (presenceApi.getActivityTimeline as jest.Mock).mockResolvedValue({
      date: "2026-10-19",
      buckets: [],
    });
    renderDashboard({ ...NO_GRANTS, timeline: true });
    expect(await screen.findByText("PRESENCE TIMELINE")).toBeInTheDocument();
    expect(screen.getByText("Work, breaks and meetings by hour")).toBeInTheDocument();
  });

  it("says once that a person outside the viewer's scope is not in their team", async () => {
    const config = { headers: new AxiosHeaders() };
    getTimesheet.mockRejectedValue(
      new AxiosError("Not found", "404", config, null, {
        status: 404,
        statusText: "",
        headers: {},
        config,
        data: { success: false, error: { code: "NOT_FOUND", message: "Unknown person" } },
      }),
    );
    renderDashboard(ALL_GRANTS);
    expect(await screen.findByText("Not in your team")).toBeInTheDocument();
    expect(screen.queryByText("SCREENSHOTS")).not.toBeInTheDocument();
  });

  it("shows offline time without activity data under the focus bar, only when there is some", async () => {
    const sheet = await getTimesheet();
    getTimesheet.mockResolvedValue({
      ...sheet,
      rows: [{ ...sheet.rows[0], unverifiedSec: 25 * 60 }],
    });
    renderDashboard(ALL_GRANTS);
    expect(await screen.findByText(/25m offline, no activity data/)).toBeInTheDocument();
  });

  it("shows the day's paid time (focus plus paid breaks) beside focus, for every viewer", async () => {
    const sheet = await getTimesheet();
    getTimesheet.mockResolvedValue({
      ...sheet,
      rows: [
        { ...sheet.rows[0], paidBreakSec: 20 * 60, paidSec: 3 * 3600 + 20 * 60, unverifiedSec: 0 },
      ],
    });
    renderDashboard({ ...NO_GRANTS, screenshots: true });
    const label = await screen.findByText("Paid time");
    expect(label.nextElementSibling).toHaveTextContent("3h 20m");
    expect(screen.queryByText(/offline, no activity data/)).not.toBeInTheDocument();
  });

  it("gives an activity manager the activity figures, chart and flow, not apps or breaks", async () => {
    renderDashboard({ ...NO_GRANTS, activity: true });
    expect(await screen.findByText("DAILY FLOW")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("TIMELINE CHART")).toBeInTheDocument();
    expect(screen.queryByText("TOP APPS")).not.toBeInTheDocument();
    expect(screen.queryByText("PRESENCE TIMELINE")).not.toBeInTheDocument();
    expect(screen.queryByText("Break")).not.toBeInTheDocument();
  });
});
