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
});
