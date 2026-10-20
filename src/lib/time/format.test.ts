import {
  businessHourOf,
  formatHour12,
  formatTime12,
  formatTimeCompact12,
  formatTimeRange12,
  twelveHour,
} from "./format";

/** SPEC 2.10 / 7.4: every time a person reads is h:mm AM/PM in the business zone. */
describe("formatTime12", () => {
  it.each([
    ["09:05", "9:05 AM"],
    ["9:05", "9:05 AM"],
    ["00:00", "12:00 AM"],
    ["12:00", "12:00 PM"],
    ["12:30", "12:30 PM"],
    ["13:05", "1:05 PM"],
    ["18:30", "6:30 PM"],
    ["23:59", "11:59 PM"],
    ["24:00", "12:00 AM"],
    ["09:30:15", "9:30 AM"],
  ])("reads the clock time %p as %p", (value, expected) => {
    expect(formatTime12(value)).toBe(expected);
  });

  it("shows an instant in the business zone, not the browser's", () => {
    // 03:35 UTC is 9:05 AM in India (UTC+5:30).
    expect(formatTime12("2026-10-13T03:35:00.000Z", "Asia/Kolkata")).toBe("9:05 AM");
    expect(formatTime12("2026-10-13T07:00:00.000Z", "Asia/Kolkata")).toBe("12:30 PM");
    expect(formatTime12("2026-10-13T18:30:00.000Z", "Asia/Kolkata")).toBe("12:00 AM");
    expect(formatTime12("2026-10-13T03:35:00.000Z", "UTC")).toBe("3:35 AM");
  });

  it("takes a Date or epoch milliseconds as well", () => {
    const at = Date.parse("2026-10-13T10:15:00.000Z");
    expect(formatTime12(at, "UTC")).toBe("10:15 AM");
    expect(formatTime12(new Date(at), "Asia/Kolkata")).toBe("3:45 PM");
  });

  it("never prints a 24-hour time or a zero-padded hour", () => {
    for (let h = 0; h < 24; h++) {
      const text = formatTime12(`${String(h).padStart(2, "0")}:07`);
      expect(text).toMatch(/^(1[0-2]|[1-9]):07 (AM|PM)$/);
    }
  });

  it("is empty for missing or unreadable input", () => {
    expect(formatTime12(null)).toBe("");
    expect(formatTime12(undefined)).toBe("");
    expect(formatTime12("")).toBe("");
    expect(formatTime12("not a time")).toBe("");
    expect(formatTime12("25:00")).toBe("");
    expect(formatTime12("10:61")).toBe("");
  });

  it("uses a plain space before AM/PM", () => {
    expect(formatTime12("2026-10-13T03:35:00.000Z", "Asia/Kolkata")).not.toMatch(/[  ]/);
  });
});

describe("helpers around it", () => {
  it("builds 12-hour text from numbers", () => {
    expect(twelveHour(0, 0)).toBe("12:00 AM");
    expect(twelveHour(12, 5)).toBe("12:05 PM");
    expect(twelveHour(23, 9)).toBe("11:09 PM");
  });

  it("writes axis hours", () => {
    expect(formatHour12(0)).toBe("12 AM");
    expect(formatHour12(9)).toBe("9 AM");
    expect(formatHour12(12)).toBe("12 PM");
    expect(formatHour12(17)).toBe("5 PM");
  });

  it("drops :00 for compact labels only", () => {
    expect(formatTimeCompact12("14:00")).toBe("2 PM");
    expect(formatTimeCompact12("14:30")).toBe("2:30 PM");
  });

  it("joins a range with an en dash", () => {
    expect(formatTimeRange12("09:30", "18:30")).toBe("9:30 AM – 6:30 PM");
    expect(formatTimeRange12("09:30", null)).toBe("9:30 AM");
  });

  it("finds the business hour of an instant", () => {
    expect(businessHourOf("2026-10-13T03:35:00.000Z", "Asia/Kolkata")).toBe(9);
    expect(businessHourOf("2026-10-13T18:30:00.000Z", "Asia/Kolkata")).toBe(0);
    expect(businessHourOf("nope")).toBeNaN();
  });
});
