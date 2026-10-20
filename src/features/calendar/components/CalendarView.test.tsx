import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { toast } from "sonner";

import { CalendarView } from "./CalendarView";
import * as api from "@/features/calendar/api/calendar";
import {
  buildYear,
  currentPatternFrom,
  dayChange,
  holidaysOf,
  isoWeekday,
  pastPatterns,
  patternOn,
  patternText,
  toggleWeekday,
  upcomingPattern,
  weekLockedText,
} from "@/features/calendar/lib/calendar";
import { readCalendar } from "@/features/calendar/api/calendar";

jest.mock("@/features/calendar/api/calendar", () => ({
  ...jest.requireActual("@/features/calendar/api/calendar"),
  getCalendar: jest.fn(),
  setWeekPattern: jest.fn(),
  setCalendarDay: jest.fn(),
  clearCalendarDay: jest.fn(),
}));
jest.mock("@/lib/time/businessTime", () => ({
  ...jest.requireActual("@/lib/time/businessTime"),
  todayKey: () => "2026-10-19",
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const mocked = api as jest.Mocked<typeof api>;
const MON_SAT = [1, 2, 3, 4, 5, 6];

describe("calendar arithmetic (SPEC 2.6)", () => {
  it("counts working days from the week pattern and the overrides", () => {
    const months = buildYear(2026, MON_SAT, []);
    expect(months).toHaveLength(12);
    // October 2026: 31 days, 4 Sundays.
    expect(months[9].workingDays).toBe(27);
    const withDiwali = buildYear(2026, MON_SAT, [
      { date: "2026-11-09", isWorking: false, label: "Diwali" },
      { date: "2026-11-15", isWorking: true, label: "Make-up day" },
    ]);
    expect(withDiwali[10].workingDays).toBe(buildYear(2026, MON_SAT, [])[10].workingDays);
  });

  it("lays out Monday-first weeks", () => {
    const oct = buildYear(2026, MON_SAT, [])[9];
    // 1 Oct 2026 is a Thursday.
    expect(isoWeekday("2026-10-01")).toBe(4);
    expect(oct.weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(oct.weeks[0][3]?.date).toBe("2026-10-01");
  });

  it("removes an override that only repeats the pattern", () => {
    // A Monday made a working day with no name: back to the pattern.
    expect(dayChange("2026-10-19", MON_SAT, { isWorking: true, label: "" })).toEqual({
      kind: "delete",
    });
    expect(dayChange("2026-10-19", MON_SAT, { isWorking: false, label: " Diwali " })).toEqual({
      kind: "put",
      isWorking: false,
      label: "Diwali",
    });
    // A Sunday made a working day.
    expect(dayChange("2026-10-18", MON_SAT, { isWorking: true, label: "" })).toEqual({
      kind: "put",
      isWorking: true,
      label: null,
    });
  });

  it("switches weekdays but never empties the week", () => {
    expect(toggleWeekday(MON_SAT, 6)).toEqual([1, 2, 3, 4, 5]);
    expect(toggleWeekday([1, 2], 7)).toEqual([1, 2, 7]);
    expect(toggleWeekday([3], 3)).toEqual([3]);
  });

  it("lists the year's named days off as holidays", () => {
    expect(
      holidaysOf(
        [
          { date: "2026-12-25", isWorking: false, label: "Christmas" },
          { date: "2026-11-09", isWorking: false, label: "Diwali" },
          { date: "2026-11-15", isWorking: true, label: "Make-up" },
          { date: "2027-01-01", isWorking: false, label: "New Year" },
        ],
        2026,
      ).map((h) => h.label),
    ).toEqual(["Diwali", "Christmas"]);
  });
});

describe("working weeks over time (a pattern applies from a day)", () => {
  const MON_FRI = [1, 2, 3, 4, 5];
  const history = [
    { from: "2026-01-01", days: MON_SAT },
    { from: "2026-10-12", days: MON_FRI },
    { from: "2026-12-01", days: MON_SAT },
  ];

  it("uses the week in effect on each day", () => {
    expect(patternOn("2026-10-10", MON_FRI, history)).toEqual(MON_SAT);
    expect(patternOn("2026-10-12", MON_FRI, history)).toEqual(MON_FRI);
    expect(patternOn("2026-12-05", MON_FRI, history)).toEqual(MON_SAT);
    expect(patternOn("2025-06-01", MON_FRI, history)).toEqual(MON_SAT);
    expect(patternOn("2026-10-10", MON_FRI, [])).toEqual(MON_FRI);
    // Saturday 10 Oct works under the old week, Saturday 17 Oct does not.
    const oct = buildYear(2026, (d) => patternOn(d, MON_FRI, history), [])[9];
    const cells = oct.weeks.flat().filter((c) => c !== null);
    expect(cells.find((c) => c?.date === "2026-10-10")?.isWorking).toBe(true);
    expect(cells.find((c) => c?.date === "2026-10-17")?.isWorking).toBe(false);
  });

  it("says when the current week began, what came before, and what is coming", () => {
    expect(currentPatternFrom(history, "2026-10-19")).toBe("2026-10-12");
    expect(pastPatterns(history, "2026-10-19")).toEqual([
      { from: "2026-01-01", days: MON_SAT, until: "2026-10-11" },
    ]);
    expect(upcomingPattern(history, "2026-10-19")).toEqual({ from: "2026-12-01", days: MON_SAT });
    expect(patternText(MON_SAT)).toBe("Mon to Sat");
    expect(patternText([1, 3, 5])).toBe("Mon, Wed, Fri");
  });

  it("reads GET /calendar as the 4.0 API sends it: the first week dated 0000-01-01", () => {
    const view = readCalendar({
      year: 2026,
      weekPattern: MON_FRI,
      weekPatternHistory: [
        { from: "0000-01-01", days: MON_SAT },
        { from: "2026-10-12", days: MON_FRI },
      ],
    });
    expect(view.weekPattern).toEqual(MON_FRI);
    expect(view.patternHistory).toEqual([
      { from: "0000-01-01", days: MON_SAT },
      { from: "2026-10-12", days: MON_FRI },
    ]);
    expect(patternOn("2019-03-02", view.weekPattern, view.patternHistory)).toEqual(MON_SAT);
    expect(currentPatternFrom(view.patternHistory, "2026-10-19")).toBe("2026-10-12");
    // A week that has always applied has no start date to show.
    expect(currentPatternFrom([{ from: "0000-01-01", days: MON_SAT }], "2026-10-19")).toBeNull();
    expect(pastPatterns(view.patternHistory, "2026-10-19")).toEqual([
      { from: "0000-01-01", days: MON_SAT, until: "2026-10-11" },
    ]);
  });

  it("says which month is locked when a new week is refused", () => {
    expect(weekLockedText("2026-09", (m) => (m === "2026-09" ? "September 2026" : m))).toBe(
      "September 2026 is locked for payroll, so its working days can't change. Pick a day after it, or unlock it in Reports first.",
    );
    expect(weekLockedText(undefined, (m) => m)).toMatch(/^A month from that day is locked/);
  });

  it("reads the history whatever it is called, and none at all", () => {
    expect(
      readCalendar({ weekPattern: MON_FRI, history: [{ from: "2026-10-12", days: MON_FRI }] })
        .patternHistory,
    ).toEqual([{ from: "2026-10-12", days: MON_FRI }]);
    expect(readCalendar({ weekPattern: MON_FRI }).patternHistory).toEqual([]);
  });
});

function renderCalendar(editable: boolean) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CalendarView editable={editable} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getCalendar.mockResolvedValue({
    weekPattern: MON_SAT,
    patternHistory: [],
    overrides: [{ date: "2026-11-09", isWorking: false, label: "Diwali" }],
    months: [],
  });
  mocked.setCalendarDay.mockResolvedValue();
  mocked.clearCalendarDay.mockResolvedValue();
  mocked.setWeekPattern.mockResolvedValue();
});

describe("CalendarView", () => {
  it("shows twelve months with working-day counts and the holidays", async () => {
    renderCalendar(true);
    const october = await screen.findByRole("region", { name: "October" });
    expect(within(october).getByText(/working days/)).toHaveTextContent("27 working days");
    expect(screen.getAllByRole("region").length).toBeGreaterThanOrEqual(12);
    expect(screen.getAllByText("Diwali").length).toBeGreaterThan(0);
  });

  it("turns a working day into a named day off", async () => {
    renderCalendar(true);
    await screen.findByRole("region", { name: "October" });
    await userEvent.click(screen.getByRole("gridcell", { name: /Fri 30 Oct: Working day/ }));
    const dialog = await screen.findByRole("dialog", { name: "Fri 30 Oct" });
    // Opening a working day offers to make it a day off.
    expect(within(dialog).getByRole("radio", { name: "Day off" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await userEvent.type(within(dialog).getByRole("textbox"), "Founders' day");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mocked.setCalendarDay).toHaveBeenCalledWith("2026-10-30", false, "Founders' day"),
    );
    expect(mocked.getCalendar).toHaveBeenCalledTimes(2);
  });

  it("puts a changed day back to the week pattern", async () => {
    renderCalendar(true);
    await screen.findByRole("region", { name: "November" });
    await userEvent.click(screen.getByRole("gridcell", { name: /Mon 9 Nov: Day off, Diwali/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Back to the week pattern/ }));
    await waitFor(() => expect(mocked.clearCalendarDay).toHaveBeenCalledWith("2026-11-09"));
  });

  it("switches a weekday from a chosen day (today by default)", async () => {
    renderCalendar(true);
    await screen.findByRole("region", { name: "October" });
    await userEvent.click(screen.getByRole("button", { name: "Sat" }));
    expect(mocked.setWeekPattern).not.toHaveBeenCalled();
    expect(screen.getByText("New working week: Mon to Fri")).toBeInTheDocument();
    expect(screen.getByLabelText("Applies from")).toHaveValue("2026-10-19");
    await userEvent.click(screen.getByRole("button", { name: "Save working week" }));
    await waitFor(() =>
      expect(mocked.setWeekPattern).toHaveBeenCalledWith([1, 2, 3, 4, 5], "2026-10-19"),
    );
  });

  it("explains a 409 MONTH_LOCKED when the new week starts in a locked month", async () => {
    mocked.setWeekPattern.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          success: false,
          error: {
            code: "MONTH_LOCKED",
            message: "2026-09 is locked for payroll.",
            details: { month: "2026-09" },
          },
        },
      },
    });
    renderCalendar(true);
    await screen.findByRole("region", { name: "October" });
    await userEvent.click(screen.getByRole("button", { name: "Sat" }));
    const from = screen.getByLabelText("Applies from");
    await userEvent.clear(from);
    await userEvent.type(from, "2026-09-15");
    await userEvent.click(screen.getByRole("button", { name: "Save working week" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("That month is locked for payroll", {
        description: expect.stringMatching(/^September 2026 is locked for payroll/),
      }),
    );
    // The draft stays, so another day can be picked.
    expect(screen.getByText("New working week: Mon to Fri")).toBeInTheDocument();
  });

  it("is read-only for a manager", async () => {
    renderCalendar(false);
    await screen.findByRole("region", { name: "October" });
    expect(screen.queryByRole("button", { name: /Fri 30 Oct/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sat" })).toBeDisabled();
    expect(screen.getByText("Read only")).toBeInTheDocument();
  });
});
