import { teamFocusSec } from "./totals";

const focus = (focusSec: number, running: boolean) => ({ focus: { focusSec, running } });

describe("teamFocusSec", () => {
  it("is the server's exact total on a past day, whatever the rows round to", () => {
    // Three rows of 8h 00m 29s: each reads 8h 00m, the total 24h 01m (exact).
    const rows = [focus(28829, false), focus(28829, false), focus(28829, false)];
    expect(teamFocusSec(86487, rows, 1_000, 999_000, false)).toBe(86487);
  });

  it("adds what the running clocks have counted since the read, today", () => {
    const rows = [focus(3600, true), focus(1800, false), focus(600, true)];
    // 90 s later: two clocks running, 90 s each.
    expect(teamFocusSec(6000, rows, 10_000, 100_000, true)).toBe(6000 + 180);
  });

  it("reads bad totals as nothing", () => {
    expect(teamFocusSec(Number.NaN, [], 0, 0, true)).toBe(0);
  });
});
