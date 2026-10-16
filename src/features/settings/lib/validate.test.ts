import {
  DEFAULT_SETTINGS,
  NUMERIC_SETTINGS,
  draftFromSettings,
  settingsFieldOf,
  settingsPatch,
  validateSettings,
} from "./validate";

describe("validateSettings", () => {
  it("accepts the defaults", () => {
    const { values, errors } = validateSettings(draftFromSettings(DEFAULT_SETTINGS));
    expect(errors).toEqual({});
    expect(values).toEqual(DEFAULT_SETTINGS);
  });

  it("matches the SPEC 1.10 bounds", () => {
    const bounds = Object.fromEntries(NUMERIC_SETTINGS.map((m) => [m.key, [m.min, m.max]]));
    expect(bounds).toEqual({
      approvalSlaHours: [12, 168],
      fullDayPct: [1, 100],
      halfDayPct: [1, 99],
      lateStartGraceMin: [0, 120],
      quietHourActiveMin: [1, 59],
      quietHoursFlag: [1, 100],
      autoCloseAfterShiftEndMin: [30, 720],
    });
  });

  it.each([
    ["approvalSlaHours", "11"],
    ["approvalSlaHours", "169"],
    ["halfDayPct", "100"],
    ["lateStartGraceMin", "121"],
    ["quietHourActiveMin", "0"],
    ["quietHoursFlag", "101"],
    ["autoCloseAfterShiftEndMin", "29"],
  ] as const)("refuses %s = %s", (key, value) => {
    const draft = { ...draftFromSettings(DEFAULT_SETTINGS), [key]: value };
    const { values, errors } = validateSettings(draft);
    expect(values).toBeNull();
    expect(errors[key]).toMatch(/from \d+ to \d+/);
  });

  it("accepts the edges", () => {
    const draft = {
      ...draftFromSettings(DEFAULT_SETTINGS),
      approvalSlaHours: "12",
      lateStartGraceMin: "0",
      autoCloseAfterShiftEndMin: "720",
    };
    expect(validateSettings(draft).errors).toEqual({});
  });

  it("wants whole numbers", () => {
    const draft = { ...draftFromSettings(DEFAULT_SETTINGS), quietHoursFlag: "4.5" };
    expect(validateSettings(draft).errors.quietHoursFlag).toMatch(/whole number/);
    const empty = { ...draftFromSettings(DEFAULT_SETTINGS), quietHoursFlag: " " };
    expect(validateSettings(empty).errors.quietHoursFlag).toBeDefined();
  });

  it("keeps a full day above a half day", () => {
    const same = { ...draftFromSettings(DEFAULT_SETTINGS), fullDayPct: "40", halfDayPct: "40" };
    expect(validateSettings(same).errors.fullDayPct).toMatch(/above the half day \(40%\)/);
    const below = { ...draftFromSettings(DEFAULT_SETTINGS), fullDayPct: "30" };
    expect(validateSettings(below).values).toBeNull();
  });
});

describe("settingsPatch", () => {
  it("sends only what changed", () => {
    expect(
      settingsPatch(DEFAULT_SETTINGS, {
        ...DEFAULT_SETTINGS,
        approvalSlaHours: 24,
        blockManagerEndDayWhenOverdue: false,
      }),
    ).toEqual({ approvalSlaHours: 24, blockManagerEndDayWhenOverdue: false });
    expect(settingsPatch(DEFAULT_SETTINGS, DEFAULT_SETTINGS)).toEqual({});
  });
});

describe("settingsFieldOf", () => {
  it("reads the field the API names", () => {
    expect(settingsFieldOf({ field: "halfDayPct" })).toBe("halfDayPct");
    expect(settingsFieldOf({ field: "somethingElse" })).toBeNull();
    expect(settingsFieldOf(undefined)).toBeNull();
  });
});
