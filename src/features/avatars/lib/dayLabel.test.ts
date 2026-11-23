import { addDaysToKey, todayKey } from "@/lib/time/businessTime";

import { dayLabel, formatTarget, formatWorked, overTargetLabel, progressOf } from "./dayLabel";

const H = 3600;
const MIN = 60;

describe("the words beside the icon", () => {
  it.each([
    ["WORKING", 5 * H + 12 * MIN, 8 * H, "Working · 5h 12m of 8h"],
    ["MEETING", 2 * H, 8 * H, "In a meeting · 2h 00m of 8h"],
    ["BREAK", 3 * H + 30 * MIN, 8 * H, "On break · 3h 30m of 8h"],
    ["ENDED", 8 * H + 15 * MIN, 8 * H, "Day ended · 8h 15m today"],
    ["NOT_STARTED", 0, 8 * H, "Not started"],
    ["WORKING", 0, 8 * H, "Working · 0h 00m of 8h"],
    ["WORKING", H, 7 * H + 30 * MIN, "Working · 1h 00m of 7h 30m"],
  ] as const)("%s, %i of %i", (status, worked, target, label) => {
    expect(dayLabel(status, worked, target)).toBe(label);
  });

  describe("a day ended", () => {
    const worked = 8 * H + 15 * MIN;

    it("says today while the date is today in business time", () => {
      expect(dayLabel("ENDED", worked, 8 * H, todayKey())).toBe("Day ended · 8h 15m today");
    });

    it("drops today once the date is earlier: the total stays until the next Start day", () => {
      expect(dayLabel("ENDED", worked, 8 * H, addDaysToKey(todayKey(), -1))).toBe(
        "Day ended · 8h 15m",
      );
      expect(dayLabel("ENDED", worked, 8 * H, "2026-01-05")).toBe("Day ended · 8h 15m");
    });

    it("goes by the business zone, not the browser's", () => {
      const justAfterMidnightInIst = new Date("2026-11-05T18:40:00Z");
      jest.useFakeTimers({ now: justAfterMidnightInIst });
      try {
        expect(dayLabel("ENDED", worked, 8 * H, "2026-11-06")).toBe("Day ended · 8h 15m today");
        expect(dayLabel("ENDED", worked, 8 * H, "2026-11-05")).toBe("Day ended · 8h 15m");
      } finally {
        jest.useRealTimers();
      }
    });

    it("only a day ended cares about the date", () => {
      expect(dayLabel("WORKING", worked, 8 * H, "2026-01-05")).toBe("Working · 8h 15m of 8h");
    });
  });

  it("drops the seconds rather than rounding up past what was worked", () => {
    expect(formatWorked(5 * H + 12 * MIN + 59)).toBe("5h 12m");
  });

  it("never shows a negative time", () => {
    expect(formatWorked(-90)).toBe("0h 00m");
    expect(formatTarget(-90)).toBe("0h");
  });
});

describe("past the target", () => {
  it.each([
    ["WORKING", 15 * MIN, "+15 min over target"],
    ["MEETING", 59 * MIN, "+59 min over target"],
    ["BREAK", 1 * MIN, "+1 min over target"],
    ["WORKING", 65 * MIN, "+1h 05m over target"],
  ] as const)("%s, %i s over", (status, over, label) => {
    expect(overTargetLabel(status, over)).toBe(label);
  });

  it("says nothing until a whole minute over", () => {
    expect(overTargetLabel("WORKING", 0)).toBeNull();
    expect(overTargetLabel("WORKING", 59)).toBeNull();
    expect(overTargetLabel("WORKING", -300)).toBeNull();
  });

  it("says nothing before the day starts or after it ends (the total already tells)", () => {
    expect(overTargetLabel("NOT_STARTED", 900)).toBeNull();
    expect(overTargetLabel("ENDED", 900)).toBeNull();
  });
});

describe("the ring's progress", () => {
  it("is the share of the target", () => {
    expect(progressOf(4 * H, 8 * H)).toBe(0.5);
  });

  it("stops at a full circle", () => {
    expect(progressOf(9 * H, 8 * H)).toBe(1);
  });

  it("is empty with no target, and never negative", () => {
    expect(progressOf(H, 0)).toBe(0);
    expect(progressOf(-H, 8 * H)).toBe(0);
  });
});
