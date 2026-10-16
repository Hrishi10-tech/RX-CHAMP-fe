import {
  MINUS,
  formatDuration,
  formatMinutesShort,
  formatPercent,
  formatSignedAmount,
  formatSignedDuration,
  formatSignedMinutes,
  roundMinutes,
  withMinusSign,
} from "./duration";

describe("formatDuration", () => {
  it.each([
    [0, "0m"],
    [29, "0m"],
    [30, "1m"],
    [60, "1m"],
    [45 * 60, "45m"],
    [60 * 60, "1h 00m"],
    [6 * 3600 + 24 * 60, "6h 24m"],
    [6 * 3600 + 4 * 60 + 29, "6h 04m"],
    [6 * 3600 + 4 * 60 + 30, "6h 05m"],
    [59 * 60 + 40, "1h 00m"],
    [1234 * 3600 + 5 * 60, "1,234h 05m"],
  ])("%p seconds is %p", (sec, text) => {
    expect(formatDuration(sec)).toBe(text);
  });

  it("puts a true minus sign on negatives", () => {
    expect(formatDuration(-20 * 60)).toBe(`${MINUS}20m`);
    expect(formatDuration(-(3600 + 5 * 60))).toBe("−1h 05m");
    expect(formatDuration(-20 * 60)).not.toContain("-");
  });

  it("never shows a sign on something that rounds to nothing", () => {
    expect(formatDuration(-29)).toBe("0m");
    expect(formatDuration(-30)).toBe(`${MINUS}1m`);
  });

  it("reads bad input as nothing", () => {
    expect(formatDuration(Number.NaN)).toBe("0m");
    expect(formatDuration(undefined)).toBe("0m");
    expect(formatDuration(null)).toBe("0m");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("0m");
  });
});

describe("signed amounts", () => {
  it("formats a change to focus time", () => {
    expect(formatSignedDuration(20 * 60)).toBe("+20m");
    expect(formatSignedDuration(-(3600 + 30 * 60))).toBe("−1h 30m");
    expect(formatSignedDuration(0)).toBe("0m");
  });

  it("formats minutes for effect copy", () => {
    expect(formatSignedMinutes(15)).toBe("+15 min");
    expect(formatSignedMinutes(-15)).toBe("−15 min");
    expect(formatSignedMinutes(0)).toBe("0 min");
  });

  it("formats an amount that could change, in minutes then hours", () => {
    expect(formatSignedAmount(15 * 60)).toBe("+15 min");
    expect(formatSignedAmount(-(90 * 60))).toBe("−1h 30m");
    expect(formatSignedAmount(20)).toBe("0 min");
  });

  it("rounds to the nearest minute, as the API's own copy does", () => {
    // A 14m 50s overrun: the API says "+15 min if approved", and so does the portal.
    expect(formatSignedAmount(890)).toBe("+15 min");
    expect(formatSignedDuration(-890)).toBe("−15m");
  });

  it("formats plain minutes", () => {
    expect(formatMinutesShort(15)).toBe("15 min");
    expect(formatMinutesShort(65)).toBe("1h 05m");
    expect(formatMinutesShort(-3)).toBe("0 min");
  });
});

describe("roundMinutes", () => {
  it("rounds each value to the nearest minute, keeping the sign", () => {
    expect(roundMinutes(89)).toBe(1);
    expect(roundMinutes(90)).toBe(2);
    expect(roundMinutes(-90)).toBe(-2);
    expect(roundMinutes(-10)).toBe(0);
    expect(Object.is(roundMinutes(-10), -0)).toBe(false);
    expect(roundMinutes(Number.NaN)).toBe(0);
  });

  it("rounds a total once, from its exact seconds, so every view agrees", () => {
    // 22 days of 8h 00m 29s: each day reads 8h 00m, the month 176h 11m (as in
    // the team report, the Excel file and the lock), not the 176h 00m the rows add up to.
    expect(formatDuration(28829)).toBe("8h 00m");
    expect(formatDuration(22 * 28829)).toBe("176h 11m");
  });
});

describe("withMinusSign", () => {
  it("replaces a hyphen used as a minus", () => {
    expect(withMinusSign("-15 min if rejected")).toBe("−15 min if rejected");
    expect(withMinusSign("Rejecting takes (-15 min) off")).toBe("Rejecting takes (−15 min) off");
  });

  it("leaves hyphens in words and ranges alone", () => {
    expect(withMinusSign("Auto-skipped")).toBe("Auto-skipped");
    expect(withMinusSign("09:30-18:30")).toBe("09:30-18:30");
  });
});

describe("formatPercent", () => {
  it("rounds and guards against an empty whole", () => {
    expect(formatPercent(1, 3)).toBe("33%");
    expect(formatPercent(5, 0)).toBe("0%");
  });
});
