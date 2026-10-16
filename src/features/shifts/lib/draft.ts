import {
  BREAK_KINDS,
  type BreakKind,
  type ShiftBreakInput,
  type ShiftRules,
  type ShiftView,
  type UpsertShiftInput,
} from "@/features/shifts/types";
import { hmToMinutes, isValidHm, minutesToHm } from "@/features/shifts/lib/time";

/**
 * The shift editor's working copy. Numbers are kept as the text typed so a field
 * can be empty or mid-edit; `checkDraft` turns it into an API body, or explains
 * what is in the way.
 */
export interface BreakDraft {
  kind: BreakKind;
  enabled: boolean;
  startTime: string;
  durationMin: string;
  windowBeforeMin: string;
  windowAfterMin: string;
  /** The desktop app shows Skip break for it (SPEC 1.4). */
  allowSkip: boolean;
}

export interface ShiftDraft {
  name: string;
  start: string;
  end: string;
  workDays: number[];
  /** Kept from the loaded shift so saving does not move it to "every company". */
  companyId: string | null;
  breaks: BreakDraft[];
  ringLeadMin: string;
  ringDurationMin: string;
  ringSound: boolean;
  reasonOnEarly: boolean;
  reasonOnLate: boolean;
  reasonMinChars: string;
  overrunReason: boolean;
  overrunGraceMin: string;
}

export type NumberField = "ringLeadMin" | "ringDurationMin" | "reasonMinChars" | "overrunGraceMin";

export type BreakNumberField = "durationMin" | "windowBeforeMin" | "windowAfterMin";

/** The API's limits (UpsertShiftDto and the domain rules), so a draft never 400s. */
export const LIMITS = {
  nameMax: 60,
  durationMin: { min: 1, max: 240 },
  windowBeforeMin: { min: 0, max: 240 },
  windowAfterMin: { min: 0, max: 480 },
  ringLeadMin: { min: 0, max: 30 },
  ringDurationMin: { min: 1, max: 30 },
  reasonMinChars: { min: 1, max: 200 },
  overrunGraceMin: { min: 0, max: 60 },
} as const;

export const BREAK_LABEL: Record<BreakKind, string> = {
  MORNING: "Morning break",
  LUNCH: "Lunch break",
  EVENING: "Evening break",
};

export const BREAK_SHORT_LABEL: Record<BreakKind, string> = {
  MORNING: "Morning",
  LUNCH: "Lunch",
  EVENING: "Evening",
};

export const DEFAULT_RULES: ShiftRules = {
  ringLeadMin: 1,
  ringDurationMin: 5,
  ringSound: true,
  reasonOnEarly: true,
  reasonOnLate: true,
  reasonMinChars: 10,
  overrunReason: false,
  // SPEC 2: a new shift's grace is now 3 minutes (existing shifts keep theirs).
  overrunGraceMin: 3,
};

/**
 * SPEC 1.4: the Skip break button is on for the morning and evening breaks and
 * off for lunch unless a Super Admin turns it on.
 */
export const DEFAULT_ALLOW_SKIP: Record<BreakKind, boolean> = {
  MORNING: true,
  LUNCH: false,
  EVENING: true,
};

export const DEFAULT_BREAKS: Record<BreakKind, ShiftBreakInput> = {
  MORNING: {
    kind: "MORNING",
    enabled: true,
    startTime: "11:00",
    durationMin: 15,
    windowBeforeMin: 30,
    windowAfterMin: 60,
    allowSkip: DEFAULT_ALLOW_SKIP.MORNING,
  },
  LUNCH: {
    kind: "LUNCH",
    enabled: true,
    startTime: "13:00",
    durationMin: 30,
    windowBeforeMin: 30,
    windowAfterMin: 60,
    allowSkip: DEFAULT_ALLOW_SKIP.LUNCH,
  },
  EVENING: {
    kind: "EVENING",
    enabled: true,
    startTime: "16:00",
    durationMin: 15,
    windowBeforeMin: 30,
    windowAfterMin: 60,
    allowSkip: DEFAULT_ALLOW_SKIP.EVENING,
  },
};

function breakToDraft(b: ShiftBreakInput): BreakDraft {
  return {
    kind: b.kind,
    enabled: b.enabled,
    startTime: b.startTime,
    durationMin: String(b.durationMin),
    windowBeforeMin: String(b.windowBeforeMin),
    windowAfterMin: String(b.windowAfterMin),
    allowSkip: b.allowSkip,
  };
}

/** A new shift: 09:30 to 18:30, Monday to Friday, the usual three breaks. */
export function newShiftDraft(): ShiftDraft {
  return {
    name: "",
    start: "09:30",
    end: "18:30",
    workDays: [1, 2, 3, 4, 5],
    companyId: null,
    breaks: BREAK_KINDS.map((k) => breakToDraft(DEFAULT_BREAKS[k])),
    ringLeadMin: String(DEFAULT_RULES.ringLeadMin),
    ringDurationMin: String(DEFAULT_RULES.ringDurationMin),
    ringSound: DEFAULT_RULES.ringSound,
    reasonOnEarly: DEFAULT_RULES.reasonOnEarly,
    reasonOnLate: DEFAULT_RULES.reasonOnLate,
    reasonMinChars: String(DEFAULT_RULES.reasonMinChars),
    overrunReason: DEFAULT_RULES.overrunReason,
    overrunGraceMin: String(DEFAULT_RULES.overrunGraceMin),
  };
}

/** An existing shift, ready to edit. A break the shift lacks is shown switched off. */
export function draftFromShift(shift: ShiftView): ShiftDraft {
  return {
    name: shift.name,
    start: shift.start,
    end: shift.end,
    workDays: [...shift.workDays].sort((a, b) => a - b),
    companyId: shift.companyId,
    breaks: BREAK_KINDS.map((kind) => {
      const b = shift.breaks.find((x) => x.kind === kind);
      return b
        ? breakToDraft({ ...b, allowSkip: b.allowSkip ?? DEFAULT_ALLOW_SKIP[kind] })
        : breakToDraft({ ...DEFAULT_BREAKS[kind], enabled: false });
    }),
    ringLeadMin: String(shift.rules.ringLeadMin),
    ringDurationMin: String(shift.rules.ringDurationMin),
    ringSound: shift.rules.ringSound,
    reasonOnEarly: shift.rules.reasonOnEarly,
    reasonOnLate: shift.rules.reasonOnLate,
    reasonMinChars: String(shift.rules.reasonMinChars),
    overrunReason: shift.rules.overrunReason,
    overrunGraceMin: String(shift.rules.overrunGraceMin),
  };
}

/** Field key for an error: "name", "start", "workDays", "ringLeadMin", "MORNING.durationMin". */
export type DraftErrors = Record<string, string>;

export interface DraftCheck {
  /** The API body, or null while something local is in the way. */
  body: UpsertShiftInput | null;
  errors: DraftErrors;
}

function wholeNumber(text: string): number | null {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

function rangeMessage(label: string, lim: { min: number; max: number }): string {
  return `${label} must be a whole number from ${lim.min} to ${lim.max}.`;
}

/**
 * Turns a draft into the API body, catching what the API would refuse outright
 * (bad times, out-of-range numbers, no working days). The shift rules themselves
 * (order, overlap, inside the shift) are the server's call, via /shifts/validate.
 */
export function checkDraft(draft: ShiftDraft): DraftCheck {
  const errors: DraftErrors = {};

  const name = draft.name.trim();
  if (name.length > LIMITS.nameMax) errors.name = `Use at most ${LIMITS.nameMax} characters.`;
  if (!isValidHm(draft.start)) errors.start = "Use a time like 09:30.";
  if (!isValidHm(draft.end)) errors.end = "Use a time like 18:30.";
  if (draft.workDays.length === 0) errors.workDays = "Pick at least one working day.";

  const rule = (field: NumberField, label: string): number => {
    const value = wholeNumber(draft[field]);
    const lim = LIMITS[field];
    if (value === null || value < lim.min || value > lim.max) {
      errors[field] = rangeMessage(label, lim);
      return DEFAULT_RULES[field];
    }
    return value;
  };

  const ringLeadMin = rule("ringLeadMin", "Ring lead");
  const ringDurationMin = rule("ringDurationMin", "Ring length");
  const reasonMinChars = rule("reasonMinChars", "Minimum reason length");
  const overrunGraceMin = rule("overrunGraceMin", "Overrun grace");

  const breaks: ShiftBreakInput[] = draft.breaks.map((b) => {
    const fallback = DEFAULT_BREAKS[b.kind];
    const label = BREAK_SHORT_LABEL[b.kind];
    const fieldError = (field: string, message: string) => {
      // A switched-off break's values are not used; never block saving on them.
      if (b.enabled) errors[`${b.kind}.${field}`] = message;
    };

    let startTime = b.startTime;
    if (!isValidHm(startTime)) {
      fieldError("startTime", "Use a time like 11:00.");
      startTime = fallback.startTime;
    }

    const num = (field: BreakNumberField, what: string): number => {
      const value = wholeNumber(b[field]);
      const lim = LIMITS[field];
      if (value === null || value < lim.min || value > lim.max) {
        fieldError(field, rangeMessage(`${label} ${what}`, lim));
        return fallback[field];
      }
      return value;
    };

    return {
      kind: b.kind,
      enabled: b.enabled,
      startTime,
      durationMin: num("durationMin", "length"),
      windowBeforeMin: num("windowBeforeMin", "window before"),
      windowAfterMin: num("windowAfterMin", "window after"),
      allowSkip: b.allowSkip ?? DEFAULT_ALLOW_SKIP[b.kind],
    };
  });

  if (Object.keys(errors).length > 0) return { body: null, errors };

  const body: UpsertShiftInput = {
    name,
    start: draft.start,
    end: draft.end,
    workDays: [...draft.workDays].sort((a, b) => a - b),
    ringLeadMin,
    ringDurationMin,
    ringSound: draft.ringSound,
    reasonOnEarly: draft.reasonOnEarly,
    reasonOnLate: draft.reasonOnLate,
    reasonMinChars,
    overrunReason: draft.overrunReason,
    overrunGraceMin,
    breaks,
  };
  if (draft.companyId) body.companyId = draft.companyId;
  return { body, errors };
}

export interface DerivedBreakTimes {
  endTime: string;
  windowOpen: string;
  windowClose: string;
  ringStart: string;
  ringEnd: string;
}

/** The same arithmetic as the API's derived times, for drawing while it answers. */
export function deriveBreakTimes(
  b: Pick<ShiftBreakInput, "startTime" | "durationMin" | "windowBeforeMin" | "windowAfterMin">,
  rules: Pick<ShiftRules, "ringLeadMin" | "ringDurationMin">,
): DerivedBreakTimes {
  const s = hmToMinutes(b.startTime);
  return {
    endTime: minutesToHm(s + b.durationMin),
    windowOpen: minutesToHm(s - b.windowBeforeMin),
    windowClose: minutesToHm(s + b.windowAfterMin),
    ringStart: minutesToHm(s - rules.ringLeadMin),
    ringEnd: minutesToHm(s - rules.ringLeadMin + rules.ringDurationMin),
  };
}

/** One break of the draft as API input, or null while any of its fields is unusable. */
export function breakInputFromDraft(b: BreakDraft): ShiftBreakInput | null {
  if (!isValidHm(b.startTime)) return null;
  const durationMin = wholeNumber(b.durationMin);
  const windowBeforeMin = wholeNumber(b.windowBeforeMin);
  const windowAfterMin = wholeNumber(b.windowAfterMin);
  if (durationMin === null || windowBeforeMin === null || windowAfterMin === null) return null;
  return {
    kind: b.kind,
    enabled: b.enabled,
    startTime: b.startTime,
    durationMin,
    windowBeforeMin,
    windowAfterMin,
    allowSkip: b.allowSkip ?? DEFAULT_ALLOW_SKIP[b.kind],
  };
}

/** The ring timing of a draft, falling back to the defaults while a field is mid-edit. */
export function ringFromDraft(
  draft: ShiftDraft,
): Pick<ShiftRules, "ringLeadMin" | "ringDurationMin"> {
  const lead = wholeNumber(draft.ringLeadMin);
  const duration = wholeNumber(draft.ringDurationMin);
  return {
    ringLeadMin: lead ?? DEFAULT_RULES.ringLeadMin,
    ringDurationMin: duration ?? DEFAULT_RULES.ringDurationMin,
  };
}
