import { amountText, daysNumber, daysText, draftProblems, isUpcoming } from "./format";

describe("leave format", () => {
  it("days with a real minus sign", () => {
    expect(daysText(1)).toBe("1 day");
    expect(daysText(0.5)).toBe("0.5 day");
    expect(daysText(2.25)).toBe("2.25 days");
    expect(daysText(0)).toBe("0 days");
    expect(daysText(-1.5)).toBe("−1.5 days");
    expect(daysText(2, { signed: true })).toBe("+2 days");
    expect(daysNumber(-0.25)).toBe("−0.25");
    expect(daysNumber(10.5)).toBe("10.5");
  });

  it("the amount of a request", () => {
    expect(amountText({ kind: "HALF_DAY", kindLabel: "Half day (first half)", days: 0.5 })).toBe(
      "Half day, first half",
    );
    expect(amountText({ kind: "FULL_DAY", kindLabel: "Full day", days: 3 })).toBe("3 days");
  });

  it("a draft's own problems", () => {
    const base = {
      category: "CLSL" as const,
      kind: "FULL_DAY" as const,
      part: null,
      startDate: "2026-11-09",
      endDate: "",
      reason: "Unwell",
    };
    expect(draftProblems(base)).toEqual({});
    expect(draftProblems({ ...base, kind: "HALF_DAY" }).part).toBeTruthy();
    expect(draftProblems({ ...base, endDate: "2026-11-08" }).endDate).toBeTruthy();
    expect(draftProblems({ ...base, reason: "x" }).reason).toBeTruthy();
    expect(draftProblems({ ...base, startDate: "" }).startDate).toBeTruthy();
  });

  it("what is upcoming", () => {
    const r = { status: "APPROVED", endDate: "2026-11-09" } as never;
    expect(isUpcoming(r, "2026-11-09")).toBe(true);
    expect(isUpcoming(r, "2026-11-10")).toBe(false);
    expect(isUpcoming({ status: "CANCELLED", endDate: "2026-12-01" } as never, "2026-11-09")).toBe(
      false,
    );
  });
});
