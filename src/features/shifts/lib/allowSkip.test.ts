import type { ShiftView } from "@/features/shifts/types";
import { breakInputFromDraft, checkDraft, draftFromShift, newShiftDraft } from "./draft";

/** SPEC 1.4: Skip button on for morning and evening, off for lunch; sent on every break. */
describe("allowSkip in the shift editor", () => {
  it("defaults on for morning and evening, off for lunch", () => {
    const draft = newShiftDraft();
    expect(draft.breaks.map((b) => [b.kind, b.allowSkip])).toEqual([
      ["MORNING", true],
      ["LUNCH", false],
      ["EVENING", true],
    ]);
  });

  it("is sent with every break in the payload", () => {
    const { body } = checkDraft({ ...newShiftDraft(), name: "General" });
    expect(body?.breaks.map((b) => [b.kind, b.allowSkip])).toEqual([
      ["MORNING", true],
      ["LUNCH", false],
      ["EVENING", true],
    ]);
  });

  it("keeps a changed setting, switched-off breaks included", () => {
    const draft = newShiftDraft();
    draft.breaks = draft.breaks.map((b) =>
      b.kind === "LUNCH"
        ? { ...b, allowSkip: true }
        : b.kind === "MORNING"
          ? { ...b, allowSkip: false, enabled: false }
          : b,
    );
    const { body } = checkDraft({ ...draft, name: "Late" });
    expect(body?.breaks.find((b) => b.kind === "LUNCH")?.allowSkip).toBe(true);
    expect(body?.breaks.find((b) => b.kind === "MORNING")).toMatchObject({
      enabled: false,
      allowSkip: false,
    });
    expect(breakInputFromDraft(draft.breaks[1])?.allowSkip).toBe(true);
  });

  it("reads the saved setting, and the default when an older API leaves it out", () => {
    const base: Omit<ShiftView, "breaks"> = {
      id: "s1",
      companyId: null,
      name: "General",
      start: "09:30",
      end: "18:30",
      overnight: false,
      workDays: [1, 2, 3, 4, 5],
      isDefault: true,
      rules: {
        ringLeadMin: 1,
        ringDurationMin: 5,
        ringSound: true,
        reasonOnEarly: true,
        reasonOnLate: true,
        reasonMinChars: 10,
        overrunReason: false,
        overrunGraceMin: 3,
      },
      usage: { people: 0, departments: [], overrides: 0 },
      createdAt: "",
      updatedAt: "",
    };
    const derived = {
      endTime: "",
      windowOpen: "",
      windowClose: "",
      ringStart: "",
      ringEnd: "",
      enabled: true,
      durationMin: 15,
      windowBeforeMin: 30,
      windowAfterMin: 60,
    };
    const draft = draftFromShift({
      ...base,
      breaks: [
        {
          ...derived,
          kind: "MORNING",
          label: "Morning break",
          startTime: "11:00",
          allowSkip: false,
        },
        { ...derived, kind: "LUNCH", label: "Lunch break", startTime: "13:00", durationMin: 30 },
      ],
    });
    expect(draft.breaks.map((b) => [b.kind, b.allowSkip])).toEqual([
      ["MORNING", false],
      ["LUNCH", false],
      ["EVENING", true],
    ]);
  });
});
