import { decidedEffectLines, liveFocusSec, pendingEffectLines } from "./focus";

describe("liveFocusSec", () => {
  it("carries the server's figure forward while running", () => {
    expect(liveFocusSec({ focusSec: 600, running: true }, 1_000, 61_000)).toBe(660);
  });

  it("holds still on a break, or when the day is not open", () => {
    expect(liveFocusSec({ focusSec: 600, running: false }, 1_000, 61_000)).toBe(600);
  });

  it("never goes backwards or below zero", () => {
    expect(liveFocusSec({ focusSec: 600, running: true }, 61_000, 1_000)).toBe(600);
    expect(liveFocusSec({ focusSec: -5, running: false }, 0)).toBe(0);
    expect(liveFocusSec(undefined, 0)).toBe(0);
  });
});

describe("effect lines", () => {
  it("says what pending approvals could still do", () => {
    expect(pendingEffectLines({ pendingPlusSec: 11 * 60, pendingMinusSec: 15 * 60 })).toEqual([
      { tone: "plus", text: "+11 min if approved" },
      { tone: "minus", text: "−15 min if rejected" },
    ]);
  });

  it("switches to hours for an hour or more", () => {
    expect(pendingEffectLines({ pendingPlusSec: 0, pendingMinusSec: 90 * 60 })).toEqual([
      { tone: "minus", text: "−1h 30m if rejected" },
    ]);
  });

  it("says nothing when nothing is pending", () => {
    expect(pendingEffectLines({ pendingPlusSec: 0, pendingMinusSec: 30 })).toEqual([]);
    expect(pendingEffectLines(null)).toEqual([]);
  });

  it("says what decisions already did", () => {
    expect(decidedEffectLines({ approvedPlusSec: 3 * 60, rejectedMinusSec: 15 * 60 })).toEqual([
      { tone: "plus", text: "+3 min approved back" },
      { tone: "minus", text: "−15 min taken off" },
    ]);
  });
});
