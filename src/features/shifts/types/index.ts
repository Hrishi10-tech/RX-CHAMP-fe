/**
 * Mirrors backend/src/modules/shifts/application/shifts.types.ts and the shift
 * DTOs. Every "HH:MM" and "YYYY-MM-DD" is business time (Asia/Kolkata); every
 * other timestamp is an ISO instant.
 */

export type BreakKind = "MORNING" | "LUNCH" | "EVENING";

export const BREAK_KINDS: BreakKind[] = ["MORNING", "LUNCH", "EVENING"];

export type ShiftSource = "OVERRIDE" | "DEPARTMENT" | "DEFAULT" | "NONE";

export interface ShiftRules {
  ringLeadMin: number;
  ringDurationMin: number;
  ringSound: boolean;
  reasonOnEarly: boolean;
  reasonOnLate: boolean;
  reasonMinChars: number;
  overrunReason: boolean;
  overrunGraceMin: number;
}

export interface ShiftBreakView {
  kind: BreakKind;
  label: string;
  enabled: boolean;
  startTime: string;
  durationMin: number;
  windowBeforeMin: number;
  windowAfterMin: number;
  /** 3.1: the desktop app offers Skip break for it (absent from older APIs). */
  allowSkip?: boolean;
  /** Derived "HH:MM" times for display. */
  endTime: string;
  windowOpen: string;
  windowClose: string;
  ringStart: string;
  ringEnd: string;
}

export interface ShiftUsage {
  /** Active people this shift applies to today. */
  people: number;
  /** Departments whose shift it is today. */
  departments: string[];
  /** People on it through a personal override today. */
  overrides: number;
}

export interface ShiftView {
  id: string;
  companyId: string | null;
  name: string;
  start: string;
  end: string;
  /** True when the shift runs past midnight. */
  overnight: boolean;
  /** ISO weekdays, 1 = Monday. */
  workDays: number[];
  isDefault: boolean;
  rules: ShiftRules;
  breaks: ShiftBreakView[];
  usage: ShiftUsage;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftValidationView {
  valid: boolean;
  /** Human-readable problems, in the order the editor shows them. */
  problems: string[];
  /** The breaks with their derived times (end, window, ring). */
  breaks: ShiftBreakView[];
}

export interface ShiftRef {
  id: string;
  name: string;
  start: string;
  end: string;
}

/** POST /shifts, PUT /shifts/:id and POST /shifts/validate body (UpsertShiftDto). */
export interface ShiftBreakInput {
  kind: BreakKind;
  enabled: boolean;
  startTime: string;
  durationMin: number;
  windowBeforeMin: number;
  windowAfterMin: number;
  /** 3.1: show the Skip break button in the desktop app for this break. */
  allowSkip: boolean;
}

export interface UpsertShiftInput extends Partial<ShiftRules> {
  name: string;
  start: string;
  end: string;
  workDays: number[];
  /** Limit to one company; omitted = every company. */
  companyId?: string;
  breaks: ShiftBreakInput[];
}

export interface DeletedShift {
  deleted: true;
  id: string;
}

// ---- Who works which shift -------------------------------------------------------

export interface DatedShift {
  /** null = no department shift (falls back to the default). */
  shift: ShiftRef | null;
  effectiveFrom: string;
}

export interface DepartmentAssignmentView {
  department: string;
  departmentKey: string;
  companyId: string | null;
  /** Active people in the department. */
  people: number;
  /** The department's shift today (null = falls back to the default shift). */
  current: DatedShift | null;
  /** A change already scheduled for a later day. */
  upcoming: DatedShift | null;
  /** People in the department on a personal override today. */
  overrides: number;
}

export interface AssignDepartmentInput {
  department: string;
  companyId?: string;
  /** null = back to the default shift. */
  shiftId: string | null;
  effectiveFrom: string;
}

export interface PersonOverride {
  shift: ShiftRef | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface PersonShiftView {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  designation: string | null;
  managerId: string | null;
  /** The shift that applies today, and why. */
  shift: ShiftRef | null;
  source: ShiftSource;
  /** The personal override in force today, if any. */
  override: PersonOverride | null;
  /** A personal change scheduled for a later day, if any. */
  upcoming: PersonOverride | null;
}

export interface GetPeopleAssignmentsParams {
  search?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export interface AssignPeopleInput {
  userIds: string[];
  /** null = back to the department's shift. */
  shiftId: string | null;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface SkippedItem {
  id: string;
  reason: string;
}

export interface AssignPeopleResult {
  assigned: string[];
  skipped: SkippedItem[];
  effectiveFrom: string;
  effectiveTo: string | null;
}
