import type { ShiftView } from "@/features/shifts/types";
import {
  breakInputFromDraft,
  checkDraft,
  deriveBreakTimes,
  draftFromShift,
  newShiftDraft,
  ringFromDraft,
  type ShiftDraft,
} from "./draft";

function withBreak(draft: ShiftDraft, kind: string, patch: Record<string, unknown>): ShiftDraft {
  return {
    ...draft,
    breaks: draft.breaks.map((b) => (b.kind === kind ? { ...b, ...patch } : b)),
  };
}

const general: ShiftView = {
  id: "s1",
  companyId: "c1",
  name: "General",
  start: "09:30",
  end: "18:30",
  overnight: false,
  workDays: [6, 1, 2, 3, 4, 5],
  isDefault: true,
  rules: {
    ringLeadMin: 1,
    ringDurationMin: 5,
    ringSound: true,
    reasonOnEarly: true,
    reasonOnLate: false,
    reasonMinChars: 10,
    overrunReason: false,
    overrunGraceMin: 2,
  },
  breaks: [
    {
      kind: "MORNING",
      label: "Morning break",
      enabled: true,
      startTime: "11:00",
      durationMin: 15,
      windowBeforeMin: 30,
      windowAfterMin: 60,
      endTime: "11:15",
      windowOpen: "10:30",
      windowClose: "12:00",
      ringStart: "10:59",
      ringEnd: "11:04",
    },
  ],
  usage: { people: 3, departments: [], overrides: 0 },
  createdAt: "",
  updatedAt: "",
};

describe("checkDraft", () => {
  it("turns a new draft into a complete API body", () => {
    const { body, errors } = checkDraft({ ...newShiftDraft(), name: "  Early  " });
    expect(errors).toEqual({});
    expect(body).toMatchObject({
      name: "Early",
      start: "09:30",
      end: "18:30",
      workDays: [1, 2, 3, 4, 5],
      ringLeadMin: 1,
      ringDurationMin: 5,
      reasonMinChars: 10,
      overrunGraceMin: 3,
    });
    expect(body?.breaks.map((b) => b.kind)).toEqual(["MORNING", "LUNCH", "EVENING"]);
    expect(body?.companyId).toBeUndefined();
  });

  it("keeps the shift's company so saving doesn't widen it to every company", () => {
    const { body } = checkDraft(draftFromShift(general));
    expect(body?.companyId).toBe("c1");
    expect(body?.workDays).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("refuses what the API would 400 on, with field keys", () => {
    const draft = withBreak(
      {
        ...newShiftDraft(),
        start: "9:3",
        workDays: [],
        ringDurationMin: "0",
        name: "x".repeat(61),
      },
      "LUNCH",
      { durationMin: "241" },
    );
    const { body, errors } = checkDraft(draft);
    expect(body).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(
      ["LUNCH.durationMin", "name", "ringDurationMin", "start", "workDays"].sort(),
    );
    expect(errors["LUNCH.durationMin"]).toMatch(/1 to 240/);
  });

  it("never blocks on a switched-off break, and sends it valid", () => {
    const draft = withBreak(newShiftDraft(), "EVENING", {
      enabled: false,
      startTime: "",
      durationMin: "",
    });
    const { body, errors } = checkDraft(draft);
    expect(errors).toEqual({});
    const evening = body?.breaks.find((b) => b.kind === "EVENING");
    expect(evening).toEqual({
      kind: "EVENING",
      enabled: false,
      startTime: "16:00",
      durationMin: 15,
      windowBeforeMin: 30,
      windowAfterMin: 60,
      // 3.1: every break definition carries its Skip button setting.
      allowSkip: true,
    });
  });

  it("rejects decimals and negatives in minute fields", () => {
    expect(checkDraft({ ...newShiftDraft(), ringLeadMin: "1.5" }).errors.ringLeadMin).toBeDefined();
    expect(
      checkDraft({ ...newShiftDraft(), overrunGraceMin: "-1" }).errors.overrunGraceMin,
    ).toBeDefined();
  });
});

describe("draftFromShift", () => {
  it("shows a break the shift lacks as switched off", () => {
    const draft = draftFromShift(general);
    expect(draft.breaks.map((b) => [b.kind, b.enabled])).toEqual([
      ["MORNING", true],
      ["LUNCH", false],
      ["EVENING", false],
    ]);
    expect(draft.reasonOnLate).toBe(false);
  });
});

describe("derived times", () => {
  it("matches the API's arithmetic", () => {
    expect(
      deriveBreakTimes(
        { startTime: "11:00", durationMin: 15, windowBeforeMin: 30, windowAfterMin: 60 },
        { ringLeadMin: 1, ringDurationMin: 5 },
      ),
    ).toEqual({
      endTime: "11:15",
      windowOpen: "10:30",
      windowClose: "12:00",
      ringStart: "10:59",
      ringEnd: "11:04",
    });
  });

  it("wraps past midnight", () => {
    expect(
      deriveBreakTimes(
        { startTime: "00:10", durationMin: 15, windowBeforeMin: 30, windowAfterMin: 60 },
        { ringLeadMin: 1, ringDurationMin: 5 },
      ).windowOpen,
    ).toBe("23:40");
  });

  it("reads a break and the ring from a half-edited draft", () => {
    const draft = withBreak(newShiftDraft(), "MORNING", { durationMin: "" });
    expect(breakInputFromDraft(draft.breaks[0])).toBeNull();
    expect(breakInputFromDraft(draft.breaks[1])).toMatchObject({ kind: "LUNCH", durationMin: 30 });
    expect(ringFromDraft({ ...draft, ringLeadMin: "" })).toEqual({
      ringLeadMin: 1,
      ringDurationMin: 5,
    });
  });
});
