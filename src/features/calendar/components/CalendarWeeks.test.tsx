import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CalendarView } from "./CalendarView";
import * as api from "@/features/calendar/api/calendar";
import { getDepartments } from "@/features/departments/api/departments";
import { DEFAULT_DEPARTMENT_ICON } from "@/features/departments/lib/icons";
import { getUsers } from "@/features/users/api/getUsers";
import type { CalendarView as CalendarData } from "@/features/calendar/types";

jest.mock("@/features/calendar/api/calendar", () => ({
  ...jest.requireActual("@/features/calendar/api/calendar"),
  getCalendar: jest.fn(),
  setCalendarDay: jest.fn(),
  clearCalendarDay: jest.fn(),
  setWeekPattern: jest.fn(),
  setSaturdays: jest.fn(),
  setWorkWeek: jest.fn(),
  clearWorkWeek: jest.fn(),
  getPersonYear: jest.fn(),
}));
jest.mock("@/features/departments/api/departments", () => ({ getDepartments: jest.fn() }));
jest.mock("@/features/users/api/getUsers", () => ({ getUsers: jest.fn() }));
jest.mock("@/lib/time/businessTime", () => ({
  ...jest.requireActual("@/lib/time/businessTime"),
  todayKey: () => "2026-10-19",
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const mocked = api as jest.Mocked<typeof api>;
const MON_FRI = [1, 2, 3, 4, 5];
const MON_SAT = [1, 2, 3, 4, 5, 6];

function dept(id: string, name: string) {
  return {
    id,
    name,
    icon: DEFAULT_DEPARTMENT_ICON,
    staffCount: 3,
    managers: [],
    idle: { enabled: null, minutes: null, reasonKeys: null },
    sharedComputer: false,
  };
}

const CALENDAR: CalendarData = {
  weekPattern: MON_SAT,
  patternHistory: [],
  overrides: [{ date: "2026-11-09", isWorking: false, label: "Diwali", departmentIds: ["d1"] }],
  months: [],
  saturdays: "OFF_2_4",
  saturdayAnchor: null,
  saturdaysLabel: "2nd and 4th Saturdays off",
  departments: [
    {
      id: "d1",
      workDays: MON_SAT,
      saturdays: "OFF_2_4",
      saturdayAnchor: null,
      saturdaysLabel: "2nd and 4th Saturdays off",
    },
  ],
  people: [
    {
      id: "u2",
      workDays: MON_FRI,
      saturdays: "NONE",
      saturdayAnchor: null,
      saturdaysLabel: "Every Saturday is off",
    },
  ],
};

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
  mocked.getCalendar.mockResolvedValue(CALENDAR);
  mocked.setCalendarDay.mockResolvedValue();
  mocked.setWorkWeek.mockResolvedValue();
  mocked.clearWorkWeek.mockResolvedValue();
  mocked.getPersonYear.mockResolvedValue({
    userId: "u1",
    year: 2026,
    source: "DEPARTMENT",
    sourceLabel: "Their department's calendar",
    workingDays: 1,
    days: [
      { date: "2026-11-09", working: false, label: "Diwali", source: "OVERRIDE" },
      { date: "2026-11-10", working: true, label: null, source: "DEPARTMENT" },
    ],
  });
  (getDepartments as jest.Mock).mockResolvedValue([dept("d1", "Sales"), dept("d2", "Support")]);
  (getUsers as jest.Mock).mockResolvedValue({
    users: [
      { id: "u1", name: "Asha", departmentId: "d1", status: "ACTIVE" },
      { id: "u2", name: "Ravi", departmentId: "d2", status: "ACTIVE" },
      { id: "u3", name: "Meera", departmentId: null, status: "ACTIVE" },
    ],
    meta: { total: 3, page: 1, limit: 50, totalPages: 1 },
  });
});

describe("days for some departments", () => {
  it("shows which departments a day is for", async () => {
    renderCalendar(true);
    expect(
      await screen.findByRole("gridcell", {
        name: "Mon 9 Nov: Working day; day off for Sales, Diwali",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Only Sales")).toBeInTheDocument();
  });

  it("sets a day off for the departments picked", async () => {
    renderCalendar(true);
    await screen.findByRole("region", { name: "October" });
    await userEvent.click(screen.getByRole("gridcell", { name: /Fri 30 Oct: Working day/ }));
    const dialog = await screen.findByRole("dialog", { name: "Fri 30 Oct" });
    await userEvent.type(within(dialog).getByRole("textbox"), "Sales day");
    await userEvent.click(within(dialog).getByRole("radio", { name: "Some departments" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(within(dialog).getByText("Pick at least one department.")).toBeInTheDocument();
    expect(mocked.setCalendarDay).not.toHaveBeenCalled();
    await userEvent.click(await within(dialog).findByRole("checkbox", { name: /Sales/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mocked.setCalendarDay).toHaveBeenCalledWith("2026-10-30", false, "Sales day", ["d1"]),
    );
  });

  it("opens a department day as it was set", async () => {
    renderCalendar(true);
    await userEvent.click(
      await screen.findByRole("gridcell", { name: /Mon 9 Nov: Working day; day off for Sales/ }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Mon 9 Nov" });
    expect(within(dialog).getByRole("radio", { name: "Day off" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(dialog).getByRole("radio", { name: "Some departments" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(dialog).getByRole("checkbox", { name: /Sales/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("takes the organisation's 2nd and 4th Saturdays off", async () => {
    renderCalendar(true);
    expect(
      await screen.findByRole("gridcell", { name: "Sat 14 Nov: Day off" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Sat 21 Nov: Working day" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("gridcell", { name: "Sat 14 Nov: Day off" }));
    expect(
      await screen.findByText(/makes Saturday a day off \(2nd and 4th Saturdays off\)/),
    ).toBeInTheDocument();
  });
});

describe("department weeks", () => {
  it("sets a department's week and clears another's", async () => {
    renderCalendar(true);
    await userEvent.click(await screen.findByRole("tab", { name: "Departments" }));
    expect(await screen.findByText("Mon to Fri; 2nd and 4th Saturdays off")).toBeInTheDocument();
    expect(screen.getByText("Follows the organisation's week")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Set week" }));
    const dialog = await screen.findByRole("dialog", { name: "Support: working days" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Sun" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save working week" }));
    await waitFor(() =>
      expect(mocked.setWorkWeek).toHaveBeenCalledWith("departments", ["d2"], {
        workDays: [1, 2, 3, 4, 5, 7],
        saturdays: "OFF_2_4",
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove the working week of Sales" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
    await waitFor(() => expect(mocked.clearWorkWeek).toHaveBeenCalledWith("departments", ["d1"]));
  });
});

describe("people's own weeks", () => {
  it("shows what decides each person's days", async () => {
    renderCalendar(true);
    await userEvent.click(await screen.findByRole("tab", { name: "People" }));
    await screen.findAllByText("Asha");
    // Phone cards and the table are both in the document under jsdom.
    expect(screen.getAllByText("Their department's calendar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Their own calendar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("The organisation's week").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mon to Fri; every Saturday is off").length).toBeGreaterThan(0);
  });

  it("sets one week for the people picked, and removes theirs", async () => {
    renderCalendar(true);
    await userEvent.click(await screen.findByRole("tab", { name: "People" }));
    await userEvent.click((await screen.findAllByRole("checkbox", { name: "Pick Asha" }))[0]);
    await userEvent.click(screen.getAllByRole("checkbox", { name: "Pick Ravi" })[0]);
    expect(screen.getByText("2 people picked")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Set their working week" }));
    const dialog = await screen.findByRole("dialog", { name: "One working week for 2 people" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Set for 2 people" }));
    await waitFor(() =>
      expect(mocked.setWorkWeek).toHaveBeenCalledWith("people", ["u1", "u2"], {
        workDays: MON_FRI,
        saturdays: "OFF_2_4",
      }),
    );

    await userEvent.click(screen.getAllByRole("checkbox", { name: "Pick Ravi" })[0]);
    await userEvent.click(screen.getAllByRole("checkbox", { name: "Pick Meera" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Remove their own week" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
    // Only the one who has a week of their own.
    await waitFor(() => expect(mocked.clearWorkWeek).toHaveBeenCalledWith("people", ["u2"]));
  });

  it("previews a person's year with what decides each day", async () => {
    renderCalendar(false);
    await userEvent.click(await screen.findByRole("tab", { name: "People" }));
    await userEvent.click(
      (await screen.findAllByRole("button", { name: "Preview Asha's year" }))[0],
    );
    const dialog = await screen.findByRole("dialog", { name: "Asha: the year" });
    expect(
      await within(dialog).findByText(
        "Their department's calendar decides most of Asha's working days.",
      ),
    ).toBeInTheDocument();
    expect(mocked.getPersonYear).toHaveBeenCalledWith("u1", 2026);
    expect(
      within(dialog).getByLabelText(
        "Mon 9 Nov: day off, Diwali. A day set on the organisation calendar.",
      ),
    ).toBeInTheDocument();
  });
});

describe("read only", () => {
  it("lets a manager read the Saturdays and weeks but change nothing", async () => {
    renderCalendar(false);
    expect(await screen.findByText("2nd and 4th Saturdays off")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Saturdays" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Departments" }));
    await screen.findByText("Mon to Fri; 2nd and 4th Saturdays off");
    expect(screen.queryByRole("button", { name: /Set week|Change/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "People" }));
    await screen.findAllByText("Asha");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
