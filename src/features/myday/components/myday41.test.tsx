import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { useDayProgress } from "@/features/avatars/hooks/useAvatars";
import { useMyMonthReport } from "@/features/reports/hooks/useReports";
import {
  useMyDayReport,
  useRemoteDay,
  useSubmitLateReason,
  useWorkdayToday,
} from "@/features/myday/hooks/useMyDay";
import { TodayView, dayStatus } from "@/features/myday/components/TodayView";
import { HistoryView } from "@/features/myday/components/HistoryView";
import type { WorkdayTodayView } from "@/features/workday/types";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/today",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/features/settings/hooks/usePresets", () => ({
  usePresetsFor: () => ["Traffic"],
}));
jest.mock("@/features/avatars/hooks/useAvatars", () => ({ useDayProgress: jest.fn() }));
jest.mock("@/features/reports/hooks/useReports", () => ({ useMyMonthReport: jest.fn() }));
// The charts and the timeline draw with libraries jsdom has no room for.
jest.mock("@/features/reports/components/MonthCharts", () => ({ FocusByDayChart: () => null }));
jest.mock("@/features/reports/components/TimelineBar", () => ({ TimelineBar: () => null }));
jest.mock("@/features/myday/hooks/useMyDay", () => ({
  TODAY_REFRESH_MS: 30_000,
  useWorkdayToday: jest.fn(),
  useMyDayReport: jest.fn(),
  useSubmitLateReason: jest.fn(),
  useRemoteDay: jest.fn(),
}));

const mutateAsync = jest.fn().mockResolvedValue(undefined);
const startRemote = jest.fn().mockResolvedValue(undefined);
const endRemote = jest.fn().mockResolvedValue(undefined);

function today(over: Partial<WorkdayTodayView> = {}): WorkdayTodayView {
  return {
    date: "2026-11-25",
    serverNow: "2026-11-25T06:00:00.000Z",
    timezone: "Asia/Kolkata",
    state: "OPEN",
    startedAt: "2026-11-25T04:20:00.000Z",
    endedAt: null,
    autoClosed: false,
    sessions: [],
    focus: {
      focusSec: 3 * 3600,
      running: false,
      spanSec: 0,
      breakSec: 900,
      meetingSec: 0,
      approvedPlusSec: 0,
      pendingPlusSec: 0,
      rejectedMinusSec: 0,
      pendingMinusSec: 0,
    },
    lateStart: null,
    shift: { id: "s1", name: "General", start: "09:30", end: "18:30" },
    expectedSec: 8 * 3600,
    skipsNeedingComment: [],
    overdueApprovals: 0,
    endDayBlockedByOverdue: false,
    settings: { approvalSlaHours: 24, reasonMinChars: 10 },
    portalUrl: null,
    ...over,
  };
}

function showDay(day: WorkdayTodayView) {
  (useWorkdayToday as jest.Mock).mockReturnValue({
    isPending: false,
    isError: false,
    data: day,
    dataUpdatedAt: Date.now(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (useDayProgress as jest.Mock).mockReturnValue({ data: { status: "WORKING" } });
  (useMyMonthReport as jest.Mock).mockReturnValue({ data: undefined });
  (useMyDayReport as jest.Mock).mockReturnValue({ data: undefined });
  (useSubmitLateReason as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });
  (useRemoteDay as jest.Mock).mockReturnValue({
    start: { mutateAsync: startRemote, isPending: false },
    end: { mutateAsync: endRemote, isPending: false },
  });
});

describe("4.1 Staff: Today", () => {
  it("shows the day, its focus time and the shift", () => {
    showDay(today());
    render(<TodayView />);
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Working")).toBeInTheDocument();
    expect(screen.getByText("3h 00m")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("asks why the day started late, and takes a preset answer as it is", async () => {
    showDay(today({ lateStart: { minutes: 25, needsReason: true, reason: null } }));
    render(<TodayView />);
    expect(screen.getByText(/started 25m late/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save reason" }));
    expect(await screen.findByText("Say why the day started late.")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Traffic" }));
    fireEvent.click(screen.getByRole("button", { name: "Save reason" }));
    expect(mutateAsync).toHaveBeenCalledWith({ reason: "Traffic", date: "2026-11-25" });
    // Saved: the box empties again.
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  });

  it("shows a biometric day's punches, the missing check-out, and starts a remote day (4.1)", () => {
    showDay(
      today({
        attendance: { source: "BIOMETRIC", biometricCode: "1042" },
        punches: [
          {
            at: "2026-11-25T04:00:00.000Z",
            direction: "IN",
            deviceId: "d1",
            source: "PUSH",
            voided: false,
          },
          {
            at: "2026-11-25T05:00:00.000Z",
            direction: "OUT",
            deviceId: "d1",
            source: "PUSH",
            voided: true,
          },
        ],
        checkoutMissing: true,
        wfh: {
          days: 1,
          label: "Full day from home",
          source: "REQUEST",
          sourceLabel: "Request",
          mask: 0,
          pendingDays: 0,
          capSec: 8 * 3600,
          canStart: true,
          canEnd: false,
          startBlocked: null,
        },
      }),
    );
    render(<TodayView />);
    expect(screen.getByText("Code 1042")).toBeInTheDocument();
    expect(screen.getByText(/No check-out was recorded/)).toBeInTheDocument();
    // The voided punch is left out.
    expect(screen.getAllByText(/Pushed/)).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Remote" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume remote day" }));
    expect(startRemote).toHaveBeenCalled();
  });

  it("names the day in a word", () => {
    expect(dayStatus({ state: "NOT_STARTED", dayOff: null, leave: null }, undefined).label).toBe(
      "Not started",
    );
    expect(
      dayStatus({ state: "NOT_STARTED", dayOff: { kind: "HOLIDAY", name: "Diwali" } }, undefined)
        .label,
    ).toBe("Diwali");
    expect(dayStatus({ state: "OPEN" }, "BREAK").label).toBe("On a break");
    expect(dayStatus({ state: "ENDED" }, "WORKING").label).toBe("Day ended");
  });
});

describe("4.1 Staff: a remote day", () => {
  const remote = (over: Partial<WorkdayTodayView> = {}) =>
    today({
      attendance: { source: "BIOMETRIC", biometricCode: null },
      sessions: [
        {
          startedAt: "2026-11-25T04:00:00.000Z",
          endedAt: null,
          endReason: null,
          source: "MOBILE_WFH",
        },
      ],
      wfh: {
        days: 1,
        label: "Full day",
        source: "REQUEST",
        sourceLabel: "Request",
        mask: 0,
        pendingDays: 0,
        capSec: 8 * 3600,
        canStart: false,
        canEnd: true,
        startBlocked: null,
      },
      ...over,
    });

  it("reads Remote while it runs, and ends after asking", async () => {
    showDay(remote());
    render(<TodayView />);
    expect(screen.getAllByText("Remote").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Working")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "End your day" }));
    expect(endRemote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "End day" }));
    await waitFor(() => expect(endRemote).toHaveBeenCalled());
  });

  it("is Working on an office day", () => {
    expect(
      dayStatus(
        {
          state: "OPEN",
          sessions: [{ startedAt: "", endedAt: null, endReason: null, source: "BIOMETRIC" }],
        },
        "WORKING",
      ).label,
    ).toBe("Working");
  });
});

describe("4.1 Staff: History", () => {
  it("shows the month and opens a day", () => {
    (useMyMonthReport as jest.Mock).mockImplementation((month: string) => ({
      isError: false,
      data: {
        month,
        locked: false,
        person: { id: "u1", name: "Sam", email: "", role: "USER", department: null },
        totals: { focusSec: 8 * 3600, plannedSec: 160 * 3600, full: 1, half: 0, absent: 0 },
        days: [
          {
            date: `${month}-02`,
            weekday: 1,
            workday: true,
            dayClass: "FULL",
            startedAt: `${month}-02T04:00:00.000Z`,
            endedAt: `${month}-02T12:30:00.000Z`,
            focusSec: 8 * 3600,
            expectedSec: 8 * 3600,
            lateStart: null,
          },
        ],
      },
    }));
    render(<HistoryView />);
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByText("Full days")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Open / }));
    expect(useMyDayReport).toHaveBeenCalledWith(expect.stringMatching(/-02$/));
  });
});
