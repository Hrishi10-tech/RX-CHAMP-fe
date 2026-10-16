import {
  formatLength,
  hmToMinutes,
  isOvernight,
  isValidHm,
  minutesToHm,
  normalizeHm,
  shiftLengthMinutes,
} from "./time";

describe("normalizeHm", () => {
  it.each([
    ["09:30", "09:30"],
    ["9:30", "09:30"],
    ["930", "09:30"],
    ["0930", "09:30"],
    ["9", "09:00"],
    ["21", "21:00"],
    ["2130", "21:30"],
    ["21.30", "21:30"],
    ["21h30", "21:30"],
    [" 7:05 ", "07:05"],
    ["00:00", "00:00"],
    ["23:59", "23:59"],
  ])("reads %p as %p", (raw, expected) => {
    expect(normalizeHm(raw)).toBe(expected);
  });

  it.each(["", "24:00", "9:60", "93", "12:5", "abc", "1:2:3", "12345", "-1:00"])(
    "refuses %p",
    (raw) => {
      expect(normalizeHm(raw)).toBeNull();
    },
  );
});

describe("clock arithmetic", () => {
  it("validates strict HH:MM only", () => {
    expect(isValidHm("09:30")).toBe(true);
    expect(isValidHm("9:30")).toBe(false);
    expect(isValidHm("24:00")).toBe(false);
  });

  it("converts both ways and wraps like the API", () => {
    expect(hmToMinutes("11:00")).toBe(660);
    expect(Number.isNaN(hmToMinutes("nope"))).toBe(true);
    expect(minutesToHm(660)).toBe("11:00");
    expect(minutesToHm(-30)).toBe("23:30");
    expect(minutesToHm(1440 + 75)).toBe("01:15");
  });

  it("measures day and overnight shifts", () => {
    expect(shiftLengthMinutes("09:30", "18:30")).toBe(540);
    expect(shiftLengthMinutes("22:00", "06:00")).toBe(480);
    expect(isOvernight("22:00", "06:00")).toBe(true);
    expect(isOvernight("09:30", "18:30")).toBe(false);
    expect(formatLength(540)).toBe("9 h");
    expect(formatLength(510)).toBe("8 h 30 min");
    expect(formatLength(45)).toBe("45 min");
    expect(formatLength(Number.NaN)).toBe("");
  });
});
