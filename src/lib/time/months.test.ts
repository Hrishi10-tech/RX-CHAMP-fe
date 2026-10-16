import {
  addMonths,
  calendarCells,
  daysInMonth,
  daysOf,
  formatDayLong,
  formatMonth,
  formatMonthShort,
  isDateKey,
  isMonthKey,
  isoWeekday,
  monthOfDate,
} from "./months";

describe("month keys", () => {
  it("recognises month and day keys", () => {
    expect(isMonthKey("2026-09")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-9")).toBe(false);
    expect(isMonthKey(null)).toBe(false);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2026-10-13")).toBe(true);
  });

  it("does month arithmetic across year ends", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-10", -13)).toBe("2025-09");
    expect(monthOfDate("2026-10-13")).toBe("2026-10");
  });

  it("knows month lengths", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-09")).toBe(30);
    expect(daysOf("2026-09")).toHaveLength(30);
    expect(daysOf("2026-09")[0]).toBe("2026-09-01");
  });

  it("names months and days", () => {
    expect(formatMonth("2026-09")).toBe("September 2026");
    expect(formatMonthShort("2026-09")).toBe("Sep 2026");
    expect(formatMonth("garbage")).toBe("garbage");
    expect(formatDayLong("2026-10-05")).toBe("5 Oct 2026");
  });

  it("builds a Monday-first calendar", () => {
    // 1 Oct 2026 is a Thursday: three blanks before it.
    expect(isoWeekday("2026-10-01")).toBe(4);
    expect(isoWeekday("2026-10-04")).toBe(7);
    const cells = calendarCells("2026-10");
    expect(cells.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(31);
  });
});
