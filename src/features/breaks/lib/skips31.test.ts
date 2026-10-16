import type { BreakRecordView } from "@/features/breaks/types";
import { cellStatusLook, isSkipRecord } from "./labels";
import { slotStatus } from "./slots";

const slot = {
  windowOpen: "2026-10-13T05:00:00.000Z",
  windowClose: "2026-10-13T06:30:00.000Z",
};

describe("3.1 skip records", () => {
  it("shows a skip as skipped, never as taken", () => {
    const skipped = { inProgress: false, outcome: "SKIPPED" } as BreakRecordView;
    const auto = { inProgress: false, outcome: "AUTO_SKIPPED" } as BreakRecordView;
    const now = Date.parse("2026-10-13T07:00:00Z");
    expect(slotStatus({ ...slot, record: skipped }, now)).toBe("SKIPPED");
    expect(slotStatus({ ...slot, record: auto }, now)).toBe("AUTO_SKIPPED");
    expect(isSkipRecord(skipped)).toBe(true);
    expect(isSkipRecord({ outcome: "TAKEN" })).toBe(false);
    expect(isSkipRecord({})).toBe(false);
  });

  it("names the new cell states, and an unknown one plainly", () => {
    expect(cellStatusLook("SKIPPED")).toEqual({ label: "Skipped", tone: "violet" });
    expect(cellStatusLook("AUTO_SKIPPED")).toEqual({ label: "Auto-skipped", tone: "neutral" });
    expect(cellStatusLook("SOMETHING_NEW")).toEqual({ label: "Something new", tone: "neutral" });
  });
});
