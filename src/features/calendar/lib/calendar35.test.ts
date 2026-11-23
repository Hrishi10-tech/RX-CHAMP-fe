import { apiClient } from "@/lib/api";
import {
  calendarDayBody,
  clearWorkWeek,
  getPersonYear,
  readCalendar,
  readPersonYear,
  setCalendarDay,
  setSaturdays,
  setWorkWeek,
} from "@/features/calendar/api/calendar";
import {
  SATURDAY_OPTIONS,
  SATURDAY_RULE_LABEL,
  buildYear,
  countBySource,
  dayChange,
  departmentsText,
  isWorkingDay,
  orgPatternSource,
  orgWeekText,
  overrideMap,
  personSource,
  saturdayAnchorProblem,
  saturdaysBody,
  saturdayWorked,
  weekdaysText,
  workWeekBody,
  workWeekInputOf,
  workWeekText,
} from "@/features/calendar/lib/calendar";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  apiClient: { get: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const http = apiClient as unknown as {
  get: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};
const OK = { data: { success: true, data: {} } };
const MON_FRI = [1, 2, 3, 4, 5];
const MON_SAT = [1, 2, 3, 4, 5, 6];

beforeEach(() => {
  jest.clearAllMocks();
  http.put.mockResolvedValue(OK);
  http.delete.mockResolvedValue(OK);
});

describe("Saturday rules (3.5)", () => {
  it("uses the API's words for each rule", () => {
    expect(SATURDAY_RULE_LABEL).toEqual({
      EVERY: "Every Saturday is a working day",
      NONE: "Every Saturday is off",
      OFF_2_4: "2nd and 4th Saturdays off",
      OFF_1_3: "1st and 3rd Saturdays off",
      OFF_1_3_5: "1st, 3rd and 5th Saturdays off",
      ALTERNATE: "Alternate Saturdays (every other week)",
    });
    expect(SATURDAY_OPTIONS.map((o) => o.value)).toEqual([
      "EVERY",
      "NONE",
      "OFF_2_4",
      "OFF_1_3",
      "OFF_1_3_5",
      "ALTERNATE",
    ]);
  });

  it("works out which Saturdays are worked, as the API does", () => {
    // November 2026: Saturdays 7, 14, 21, 28.
    const sats = ["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"];
    expect(sats.map((d) => saturdayWorked("OFF_2_4", null, d))).toEqual([true, false, true, false]);
    expect(sats.map((d) => saturdayWorked("OFF_1_3", null, d))).toEqual([false, true, false, true]);
    expect(saturdayWorked("OFF_1_3_5", null, "2026-10-31")).toBe(false);
    expect(sats.map((d) => saturdayWorked("ALTERNATE", "2026-11-07", d))).toEqual([
      true,
      false,
      true,
      false,
    ]);
    // An anchor before the date counts back as well.
    expect(saturdayWorked("ALTERNATE", "2026-11-21", "2026-11-07")).toBe(true);
    expect(saturdayWorked("ALTERNATE", null, "2026-11-14")).toBe(true);
  });

  it("takes the organisation's Saturdays off by its rule in the year view", () => {
    const view = {
      weekPattern: MON_SAT,
      patternHistory: [],
      saturdays: "OFF_2_4" as const,
      saturdayAnchor: null,
    };
    const nov = buildYear(2026, orgPatternSource(view), [])[10];
    const every = buildYear(2026, orgPatternSource({ ...view, saturdays: "EVERY" }), [])[10];
    expect(every.workingDays - nov.workingDays).toBe(2);
    const cells = nov.weeks.flat();
    expect(cells.find((c) => c?.date === "2026-11-14")?.isWorking).toBe(false);
    expect(cells.find((c) => c?.date === "2026-11-21")?.isWorking).toBe(true);
    // A week without Saturday: the rule changes nothing.
    const monFri = orgPatternSource({ ...view, weekPattern: MON_FRI, saturdays: "EVERY" });
    expect(monFri("2026-11-21")).toEqual(MON_FRI);
  });

  it("sends the rule, and the anchor only for alternate Saturdays", () => {
    expect(saturdaysBody("OFF_2_4", "2026-11-07")).toEqual({ saturdays: "OFF_2_4" });
    expect(saturdaysBody("ALTERNATE", "2026-11-07")).toEqual({
      saturdays: "ALTERNATE",
      saturdayAnchor: "2026-11-07",
    });
    expect(saturdayAnchorProblem("ALTERNATE", "2026-11-09")).toBe(
      "Pick a Saturday that is worked.",
    );
    expect(saturdayAnchorProblem("ALTERNATE", "")).toBe("Pick a Saturday that is worked.");
    expect(saturdayAnchorProblem("ALTERNATE", "2026-11-07")).toBeNull();
    expect(saturdayAnchorProblem("NONE", null)).toBeNull();
  });

  it("PUTs /calendar/saturdays", async () => {
    await setSaturdays("ALTERNATE", "2026-11-07");
    expect(http.put).toHaveBeenCalledWith("/api/v1/calendar/saturdays", {
      saturdays: "ALTERNATE",
      saturdayAnchor: "2026-11-07",
    });
  });
});

describe("weeks of their own for departments and people (3.5)", () => {
  it("puts Saturday in the week unless every Saturday is off", () => {
    expect(workWeekBody(["d1"], { workDays: MON_FRI, saturdays: "OFF_2_4" })).toEqual({
      ids: ["d1"],
      workDays: MON_SAT,
      saturdays: "OFF_2_4",
    });
    expect(workWeekBody(["d1"], { workDays: [...MON_FRI, 6], saturdays: "NONE" })).toEqual({
      ids: ["d1"],
      workDays: MON_FRI,
      saturdays: "NONE",
    });
    expect(
      workWeekBody(["u1", "u2", "u1"], {
        workDays: [7, 2, 1, 2],
        saturdays: "ALTERNATE",
        saturdayAnchor: "2026-11-07",
      }),
    ).toEqual({
      ids: ["u1", "u2"],
      workDays: [1, 2, 6, 7],
      saturdays: "ALTERNATE",
      saturdayAnchor: "2026-11-07",
    });
    // An anchor left over from an earlier choice is not sent.
    expect(
      workWeekBody(["u1"], { workDays: MON_FRI, saturdays: "EVERY", saturdayAnchor: "2026-11-07" }),
    ).not.toHaveProperty("saturdayAnchor");
  });

  it("opens a saved week in the form with Saturday folded into the rule", () => {
    expect(
      workWeekInputOf({
        id: "d1",
        workDays: MON_SAT,
        saturdays: "OFF_1_3",
        saturdayAnchor: null,
        saturdaysLabel: "",
      }),
    ).toEqual({ workDays: MON_FRI, saturdays: "OFF_1_3" });
    // A week without Saturday has every Saturday off, whatever the stored rule.
    expect(
      workWeekInputOf({
        id: "d1",
        workDays: MON_FRI,
        saturdays: "EVERY",
        saturdayAnchor: null,
        saturdaysLabel: "",
      }),
    ).toEqual({ workDays: MON_FRI, saturdays: "NONE" });
    expect(workWeekInputOf(undefined)).toBeNull();
  });

  it("says a week in a line", () => {
    expect(weekdaysText([1, 2, 3, 4, 5, 7])).toBe("Mon to Fri and Sun");
    expect(weekdaysText([1, 3, 5])).toBe("Mon, Wed and Fri");
    expect(weekdaysText([6])).toBe("No weekdays");
    expect(workWeekText({ workDays: MON_SAT, saturdays: "OFF_2_4" })).toBe(
      "Mon to Fri; 2nd and 4th Saturdays off",
    );
    expect(workWeekText({ workDays: MON_FRI, saturdays: "EVERY" })).toBe(
      "Mon to Fri; every Saturday is off",
    );
    expect(orgWeekText({ weekPattern: MON_FRI, saturdays: "OFF_2_4" })).toBe("Mon to Fri");
    expect(orgWeekText({ weekPattern: MON_SAT, saturdays: "EVERY" })).toBe(
      "Mon to Fri; every Saturday is a working day",
    );
  });

  it("PUTs and DELETEs /calendar/departments and /calendar/people", async () => {
    await setWorkWeek("departments", ["d1"], { workDays: MON_FRI, saturdays: "OFF_2_4" });
    expect(http.put).toHaveBeenCalledWith("/api/v1/calendar/departments", {
      ids: ["d1"],
      workDays: MON_SAT,
      saturdays: "OFF_2_4",
    });
    await setWorkWeek("people", ["u1", "u2"], { workDays: MON_FRI, saturdays: "NONE" });
    expect(http.put).toHaveBeenLastCalledWith("/api/v1/calendar/people", {
      ids: ["u1", "u2"],
      workDays: MON_FRI,
      saturdays: "NONE",
    });
    await clearWorkWeek("people", ["u1", "u1", "u2"]);
    expect(http.delete).toHaveBeenCalledWith("/api/v1/calendar/people", {
      data: { ids: ["u1", "u2"] },
    });
  });

  it("refuses quietly-failed saves", async () => {
    http.put.mockResolvedValueOnce({ data: { success: false, message: "Unknown department" } });
    await expect(
      setWorkWeek("departments", ["x"], { workDays: MON_FRI, saturdays: "NONE" }),
    ).rejects.toThrow("Unknown department");
  });

  it("decides a person's week: their own, then their department's, then the organisation's", () => {
    const week = (id: string) => ({
      id,
      workDays: MON_FRI,
      saturdays: "NONE" as const,
      saturdayAnchor: null,
      saturdaysLabel: "",
    });
    const view = { people: [week("u1")], departments: [week("d1")] };
    expect(personSource({ id: "u1", departmentId: "d1" }, view).source).toBe("PERSON");
    expect(personSource({ id: "u2", departmentId: "d1" }, view).source).toBe("DEPARTMENT");
    expect(personSource({ id: "u2", departmentId: "d2" }, view)).toEqual({
      source: "ORGANISATION",
      week: null,
    });
    expect(personSource({ id: "u2" }, view).source).toBe("ORGANISATION");
  });
});

describe("days for some departments (3.5 department holidays)", () => {
  it("keeps the organisation's answer on a day set for some departments", () => {
    const overrides = overrideMap([
      { date: "2026-11-09", isWorking: false, label: "Diwali", departmentIds: ["d1"] },
      { date: "2026-11-10", isWorking: false, label: "Bhai Dooj", departmentIds: [] },
    ]);
    expect(isWorkingDay("2026-11-09", MON_SAT, overrides)).toBe(true);
    expect(isWorkingDay("2026-11-10", MON_SAT, overrides)).toBe(false);
    const cell = buildYear(2026, MON_SAT, [...overrides.values()])[10]
      .weeks.flat()
      .find((c) => c?.date === "2026-11-09");
    expect(cell).toMatchObject({
      isWorking: true,
      overridden: true,
      departmentIds: ["d1"],
      setWorking: false,
      label: "Diwali",
    });
  });

  it("never treats a day for some departments as the pattern", () => {
    // A Sunday made a day off for one department: still saved.
    expect(
      dayChange("2026-10-18", MON_SAT, { isWorking: false, label: "", departmentIds: ["d1"] }),
    ).toEqual({ kind: "put", isWorking: false, label: null, departmentIds: ["d1"] });
    expect(dayChange("2026-10-18", MON_SAT, { isWorking: false, label: "" })).toEqual({
      kind: "delete",
    });
  });

  it("sends the departments with the day, and none for everyone", async () => {
    expect(calendarDayBody(false, "Diwali", ["d1", "d2", "d1"])).toEqual({
      isWorking: false,
      label: "Diwali",
      departmentIds: ["d1", "d2"],
    });
    expect(calendarDayBody(true, null)).toEqual({ isWorking: true, departmentIds: [] });
    await setCalendarDay("2026-11-09", false, "Diwali", ["d1"]);
    expect(http.put).toHaveBeenCalledWith("/api/v1/calendar/days/2026-11-09", {
      isWorking: false,
      label: "Diwali",
      departmentIds: ["d1"],
    });
  });

  it("names the departments a day is for", () => {
    const names = new Map([
      ["d1", "Sales"],
      ["d2", "Support"],
    ]);
    expect(departmentsText(["d1", "d2"], names)).toBe("Sales, Support");
    expect(departmentsText(["d1", "gone"], names)).toBe("Sales and 1 more");
    expect(departmentsText(["gone", "lost"], names)).toBe("2 departments");
  });
});

describe("reading the 4.0 API", () => {
  it("reads GET /calendar with the 3.5 fields", () => {
    const view = readCalendar({
      year: 2026,
      weekPattern: MON_SAT,
      saturdays: "OFF_2_4",
      saturdayAnchor: null,
      saturdaysLabel: "2nd and 4th Saturdays off",
      departments: [
        {
          id: "d1",
          workDays: [5, 1, 2, 3, 4],
          saturdays: "NONE",
          saturdayAnchor: null,
          saturdaysLabel: "Every Saturday is off",
        },
        { workDays: MON_FRI },
      ],
      people: [{ id: "u1", workDays: MON_SAT, saturdays: "WHAT", saturdayAnchor: null }],
      overrides: [
        { date: "2026-11-09", isWorking: false, label: "Diwali", departmentIds: ["d1", 3] },
      ],
    });
    expect(view.saturdays).toBe("OFF_2_4");
    expect(view.saturdaysLabel).toBe("2nd and 4th Saturdays off");
    expect(view.departments).toEqual([
      {
        id: "d1",
        workDays: MON_FRI,
        saturdays: "NONE",
        saturdayAnchor: null,
        saturdaysLabel: "Every Saturday is off",
      },
    ]);
    // An unknown rule reads as every Saturday, with the API's words.
    expect(view.people[0]).toMatchObject({
      saturdays: "EVERY",
      saturdaysLabel: "Every Saturday is a working day",
    });
    expect(view.overrides[0].departmentIds).toEqual(["d1"]);
  });

  it("reads an older answer without them", () => {
    const view = readCalendar({ weekPattern: MON_SAT });
    expect(view).toMatchObject({
      saturdays: "EVERY",
      saturdayAnchor: null,
      departments: [],
      people: [],
    });
  });

  it("reads GET /calendar/people/:userId/year and counts what decides each day", async () => {
    http.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          userId: "u1",
          year: 2026,
          source: "DEPARTMENT",
          sourceLabel: "Their department's calendar",
          workingDays: 1,
          days: [
            { date: "2026-01-01", working: false, label: "New Year", source: "OVERRIDE" },
            { date: "2026-01-02", working: true, label: null, source: "DEPARTMENT" },
            { date: "2026-01-03", working: false, label: "", source: "NOPE" },
          ],
        },
      },
    });
    const year = await getPersonYear("u1", 2026);
    expect(http.get).toHaveBeenCalledWith("/api/v1/calendar/people/u1/year", {
      params: { year: 2026 },
    });
    expect(year.sourceLabel).toBe("Their department's calendar");
    expect(year.days[2]).toEqual({
      date: "2026-01-03",
      working: false,
      label: null,
      source: "DEPARTMENT",
    });
    expect(countBySource(year.days)).toEqual({
      OVERRIDE: 1,
      PERSON: 0,
      DEPARTMENT: 2,
      ORGANISATION: 0,
    });
    expect(readPersonYear({}, "u9", 2027)).toMatchObject({
      userId: "u9",
      year: 2027,
      source: "ORGANISATION",
      sourceLabel: "The organisation's week",
      workingDays: 0,
    });
  });
});
