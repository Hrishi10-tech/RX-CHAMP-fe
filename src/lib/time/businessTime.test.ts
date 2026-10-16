import {
  addDaysToKey,
  dateKeyOf,
  formatDay,
  formatDayWithWeekday,
  formatMinutes,
  hmOf,
  relativeDay,
  todayKey,
} from "./businessTime";

const IST = "Asia/Kolkata";

describe("business dates", () => {
  it("takes the date in the business zone, not UTC", () => {
    // 20:00 UTC on the 12th is 01:30 on the 13th in India.
    expect(dateKeyOf(new Date("2026-10-12T20:00:00Z"), IST)).toBe("2026-10-13");
    expect(todayKey(new Date("2026-10-13T05:29:00Z"), IST)).toBe("2026-10-13");
  });

  it("formats instants as 24h HH:MM in the business zone", () => {
    expect(hmOf("2026-10-13T05:30:00.000Z", IST)).toBe("11:00");
    expect(hmOf("2026-10-13T13:15:00.000Z", IST)).toBe("18:45");
    expect(hmOf(null)).toBe("");
    expect(hmOf("not a date")).toBe("");
  });

  it("formats keys as 13 Oct and Tue 13 Oct", () => {
    expect(formatDay("2026-10-13")).toBe("13 Oct");
    expect(formatDay("2026-01-05")).toBe("5 Jan");
    expect(formatDayWithWeekday("2026-10-13")).toBe("Tue 13 Oct");
    expect(formatDayWithWeekday("2026-10-18")).toBe("Sun 18 Oct");
    expect(formatDay("garbage")).toBe("garbage");
  });

  it("adds days across month and year ends", () => {
    expect(addDaysToKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysToKey("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("names today, yesterday and tomorrow", () => {
    expect(relativeDay("2026-10-13", "2026-10-13")).toBe("Today");
    expect(relativeDay("2026-10-12", "2026-10-13")).toBe("Yesterday");
    expect(relativeDay("2026-10-14", "2026-10-13")).toBe("Tomorrow");
    expect(relativeDay("2026-10-01", "2026-10-13")).toBe("1 Oct");
  });
});

describe("formatMinutes", () => {
  it.each([
    [0, "0 min"],
    [3, "under 1 min"],
    [29, "under 1 min"],
    [30, "1 min"],
    [60, "1 min"],
    [89, "1 min"],
    [90, "2 min"],
    [120, "2 min"],
    [19 * 60, "19 min"],
    [19 * 60 + 29, "19 min"],
    [19 * 60 + 59, "20 min"],
    [3600, "1 h"],
    [65 * 60, "1 h 5 min"],
    [-5, "0 min"],
  ])("%p seconds is %p", (sec, text) => {
    expect(formatMinutes(sec)).toBe(text);
  });
});
