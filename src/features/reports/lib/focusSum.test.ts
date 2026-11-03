import { focusSum } from "./focusSum";

describe("focusSum", () => {
  it("adds up on screen even when the seconds would not", () => {
    // 6h 24m 40s of focus and 44m 40s of breaks: each reads to the nearest
    // minute (6h 25m, 45m), and time worked is their sum, not 7h 09m 20s → 7h 09m.
    expect(
      focusSum({ focusSec: 23080, breakSec: 2680, approvedPlusSec: 0, rejectedMinusSec: 0 }),
    ).toBe("6h 25m = time worked 7h 10m − breaks 45m");
  });

  it("shows what decisions changed", () => {
    expect(
      focusSum({ focusSec: 8 * 3600, breakSec: 3600, approvedPlusSec: 890, rejectedMinusSec: 900 }),
    ).toBe("8h 00m = time worked 9h 00m − breaks 1h 00m + 15m approved back − 15m rejected");
  });

  it("leaves out parts that round to nothing", () => {
    expect(
      focusSum({ focusSec: 3600, breakSec: 20, approvedPlusSec: 0, rejectedMinusSec: 0 }),
    ).toBe("1h 00m = time worked 1h 00m");
  });

  it("shows minutes adjusted by hand (3.3), either way", () => {
    expect(
      focusSum({
        focusSec: 8 * 3600,
        breakSec: 3600,
        approvedPlusSec: 0,
        rejectedMinusSec: 0,
        adjustedSec: 1800,
      }),
    ).toBe("8h 00m = time worked 8h 30m − breaks 1h 00m + 30m adjusted by hand");
    expect(
      focusSum({
        focusSec: 7 * 3600,
        breakSec: 0,
        approvedPlusSec: 0,
        rejectedMinusSec: 0,
        adjustedSec: -1200,
      }),
    ).toBe("7h 00m = time worked 7h 20m − 20m adjusted by hand");
  });

  it("does not invent time worked once deductions take the day to zero", () => {
    expect(
      focusSum({
        focusSec: 0,
        breakSec: 0,
        approvedPlusSec: 0,
        rejectedMinusSec: 0,
        adjustedSec: -1200,
      }),
    ).toBe("0m = time worked, less 20m of deductions (never below zero)");
    expect(focusSum({ focusSec: 0, breakSec: 0, approvedPlusSec: 0, rejectedMinusSec: 900 })).toBe(
      "0m = time worked, less 15m of deductions (never below zero)",
    );
  });
});
