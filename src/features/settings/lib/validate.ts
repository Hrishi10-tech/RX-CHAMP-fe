import type {
  AppSettingsPatch,
  AppSettingsView,
  NumericSettingKey,
} from "@/features/settings/types";

/**
 * The SPEC 1.10 table: defaults and bounds. The form checks the same bounds as
 * the API so a save never comes back with a 400 for a value it could have caught.
 */
export interface NumericSettingMeta {
  key: NumericSettingKey;
  label: string;
  help: string;
  unit: string;
  min: number;
  max: number;
  default: number;
}

export const NUMERIC_SETTINGS: NumericSettingMeta[] = [
  {
    key: "approvalSlaHours",
    label: "Time to decide an approval",
    help: "After this, an item is overdue and goes to the Admin.",
    unit: "hours",
    min: 12,
    max: 168,
    default: 48,
  },
  {
    key: "fullDayPct",
    label: "Full day",
    help: "Focus time at or above this share of the expected hours. Must be above the half day.",
    unit: "%",
    min: 1,
    max: 100,
    default: 80,
  },
  {
    key: "halfDayPct",
    label: "Half day",
    help: "Focus time at or above this share of the expected hours. Below it is absent.",
    unit: "%",
    min: 1,
    max: 99,
    default: 40,
  },
  {
    key: "lateStartGraceMin",
    label: "Late start after",
    help: "Start Day more than this after the shift starts is reported as a late start. It never changes focus time.",
    unit: "min",
    min: 0,
    max: 120,
    default: 10,
  },
  {
    key: "quietHourActiveMin",
    label: "Quiet hour below",
    help: "An hour with fewer active keyboard and mouse minutes than this, and no break or meeting, is a quiet hour.",
    unit: "active min",
    min: 1,
    max: 59,
    default: 20,
  },
  {
    key: "quietHoursFlag",
    label: "Needs a look from",
    help: "This many quiet hours in a month flags the person in the month report.",
    unit: "quiet hours",
    min: 1,
    max: 100,
    default: 4,
  },
  {
    key: "breakBufferMin",
    label: "Paid break buffer",
    help: "Minutes a day paid on top of the scheduled breaks: quick breaks and overruns use it first. The daily focus target is the shift minus breaks and buffer.",
    unit: "min a day",
    min: 0,
    max: 60,
    default: 10,
  },
  {
    key: "autoCloseAfterShiftEndMin",
    label: "Close a forgotten day after",
    help: "A day nobody ended closes this long after the shift ends, at the last keyboard or mouse input.",
    unit: "min",
    min: 30,
    max: 720,
    default: 240,
  },
];

export const DEFAULT_SETTINGS: AppSettingsView = {
  approvalSlaHours: 48,
  blockManagerEndDayWhenOverdue: true,
  fullDayPct: 80,
  halfDayPct: 40,
  lateStartGraceMin: 10,
  quietHourActiveMin: 20,
  quietHoursFlag: 4,
  autoCloseAfterShiftEndMin: 240,
  breakBufferMin: 10,
};

/** The form keeps numbers as typed, so a field can be empty mid-edit. */
export type SettingsDraft = Record<NumericSettingKey, string> & {
  blockManagerEndDayWhenOverdue: boolean;
};

export type SettingsErrors = Partial<Record<keyof AppSettingsView, string>>;

export function draftFromSettings(settings: AppSettingsView): SettingsDraft {
  const draft = {
    blockManagerEndDayWhenOverdue: settings.blockManagerEndDayWhenOverdue,
  } as SettingsDraft;
  for (const meta of NUMERIC_SETTINGS) {
    const value = settings[meta.key];
    draft[meta.key] = String(typeof value === "number" ? value : meta.default);
  }
  return draft;
}

function wholeNumber(text: string): number | null {
  const t = text.trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

/**
 * Checks a draft against the bounds: whole numbers in range, and a full day
 * above a half day. Returns the parsed values when everything is fine.
 */
export function validateSettings(draft: SettingsDraft): {
  values: AppSettingsView | null;
  errors: SettingsErrors;
} {
  const errors: SettingsErrors = {};
  const values = {
    blockManagerEndDayWhenOverdue: Boolean(draft.blockManagerEndDayWhenOverdue),
  } as AppSettingsView;

  for (const meta of NUMERIC_SETTINGS) {
    const n = wholeNumber(draft[meta.key] ?? "");
    if (n === null) {
      errors[meta.key] = `Enter a whole number from ${meta.min} to ${meta.max}.`;
    } else if (n < meta.min || n > meta.max) {
      errors[meta.key] = `Use a number from ${meta.min} to ${meta.max}.`;
    } else {
      values[meta.key] = n;
    }
  }

  if (!errors.fullDayPct && !errors.halfDayPct && values.fullDayPct <= values.halfDayPct) {
    errors.fullDayPct = `A full day must be above the half day (${values.halfDayPct}%).`;
  }

  return { values: Object.keys(errors).length ? null : values, errors };
}

/** Only what changed, for `PATCH /settings`. */
export function settingsPatch(original: AppSettingsView, next: AppSettingsView): AppSettingsPatch {
  const patch: AppSettingsPatch = {};
  for (const key of Object.keys(next) as (keyof AppSettingsView)[]) {
    if (next[key] !== original[key]) {
      (patch as Record<string, number | boolean>)[key] = next[key];
    }
  }
  return patch;
}

/** The field a 400 VALIDATION_ERROR names in `details.field`, when it is one of ours. */
export function settingsFieldOf(
  details: Record<string, unknown> | undefined,
): keyof AppSettingsView | null {
  const field = details?.field;
  if (typeof field !== "string") return null;
  return field in DEFAULT_SETTINGS ? (field as keyof AppSettingsView) : null;
}
