import { dayOffText, holidayText, inputShare, lateText } from "./dayNotes";

describe("dayOffText", () => {
  it("names a holiday, or says Holiday", () => {
    expect(dayOffText({ dayOff: { kind: "HOLIDAY", name: "Diwali" } })).toBe("Holiday: Diwali");
    expect(dayOffText({ dayOff: { kind: "HOLIDAY", name: " " } })).toBe("Holiday");
    expect(dayOffText({ dayOff: { kind: "HOLIDAY", name: null } })).toBe("Holiday");
    expect(dayOffText({ dayOff: { kind: "WEEKLY_OFF", name: null } })).toBe("Weekly day off");
    expect(dayOffText({ dayOff: null })).toBeNull();
    expect(dayOffText({})).toBeNull();
  });

  it("day lists name holidays only (they already say Day off)", () => {
    expect(holidayText({ dayOff: { kind: "HOLIDAY", name: "Diwali" } })).toBe("Holiday: Diwali");
    expect(holidayText({ dayOff: { kind: "WEEKLY_OFF", name: null } })).toBeNull();
  });
});

describe("lateText", () => {
  it("gives the minutes and the reason", () => {
    expect(lateText({ lateStart: { minutes: 12, reason: "Traffic" } })).toBe(
      "12 min late: Traffic",
    );
    expect(lateText({ lateStart: { minutes: 12, reason: null } })).toBe(
      "12 min late, no reason given",
    );
    expect(lateText({ lateStart: { minutes: 12 } })).toBe("12 min late, no reason given");
    expect(lateText({ lateStart: { minutes: 0 } })).toBeNull();
    expect(lateText({ lateStart: null })).toBeNull();
  });
});

describe("inputShare", () => {
  it("adds up to 100", () => {
    const s = inputShare({ activeSec: 1000, idleSec: 1000, noDataSec: 1000, availableSec: 3000 });
    expect(s && s.activePct + s.idlePct + s.noDataPct).toBe(100);
  });

  it("uses the available time as the whole", () => {
    const s = inputShare({ activeSec: 3600, idleSec: 1800, noDataSec: 0, availableSec: 7200 });
    expect(s).toMatchObject({
      activePct: 50,
      idlePct: 25,
      noDataPct: 25,
      noDataSec: 1800,
      availableSec: 7200,
    });
  });

  it("rounds 1/3 each to 34, 33, 33", () => {
    const s = inputShare({ activeSec: 100, idleSec: 100, noDataSec: 100, availableSec: 300 });
    expect(s && [s.activePct, s.idlePct, s.noDataPct]).toEqual([34, 33, 33]);
  });

  it("is null with nothing available", () => {
    expect(inputShare({ activeSec: 0, idleSec: 0, noDataSec: 0, availableSec: 0 })).toBeNull();
    expect(inputShare(null)).toBeNull();
  });
});
