import { checkDraft, signedLabel, signedMinutes, type AdjustmentDraft } from "./form";

const TODAY = "2026-11-03";
const ok: AdjustmentDraft = {
  direction: "ADD",
  minutes: "30",
  date: "2026-11-02",
  reason: "Agent missed Start Day until 10:00",
};

describe("checkDraft (the server's rules, before the request)", () => {
  it("accepts a whole number of minutes, a day in reach and a reason", () => {
    expect(checkDraft(ok, TODAY)).toEqual({});
    expect(checkDraft({ ...ok, minutes: "720", date: "2026-09-02" }, TODAY)).toEqual({});
    expect(checkDraft({ ...ok, date: TODAY, reason: "Crash" }, TODAY)).toEqual({});
  });

  it.each([
    [{ minutes: "" }, "minutes"],
    [{ minutes: "0" }, "minutes"],
    [{ minutes: "1.5" }, "minutes"],
    [{ minutes: "721" }, "minutes"],
    [{ date: "" }, "date"],
    [{ date: "2026-11-04" }, "date"],
    [{ date: "2026-09-01" }, "date"],
    [{ reason: " ok  " }, "reason"],
    [{ reason: "x".repeat(301) }, "reason"],
  ] as const)("names the field for %p", (over, field) => {
    expect(Object.keys(checkDraft({ ...ok, ...over }, TODAY))).toEqual([field]);
  });
});

describe("signed minutes and labels", () => {
  it("takes minutes off with a negative number", () => {
    expect(signedMinutes({ direction: "ADD", minutes: "45" })).toBe(45);
    expect(signedMinutes({ direction: "TAKE_OFF", minutes: "45" })).toBe(-45);
    expect(signedMinutes({ direction: "ADD", minutes: "" })).toBe(0);
  });

  it("reads with a real minus sign and hours past 60 minutes", () => {
    expect(signedLabel(30)).toBe("+30 min");
    expect(signedLabel(-90)).toBe("−1 h 30 min");
    expect(signedLabel(120)).toBe("+2 h");
  });
});
