/**
 * Biometric attendance (3.5): docs/3.5/API.md, section 2. 4.0: every answer is the
 * organisation's in view (X-Org-Id); each organisation runs its own integration.
 */

export type AttendanceSource = "AGENT" | "BIOMETRIC";
export type PunchDirection = "IN" | "OUT";
export type PunchSource = "PUSH" | "PULL" | "CSV" | "MANUAL";

export interface PersonAttendanceView {
  userId: string;
  name: string;
  email: string;
  role: string;
  /** The department's name (4.0 keeps it in step with the person's department row). */
  department: string | null;
  /** 4.0: always the organisation in view. */
  companyId: string | null;
  companyName: string | null;
  attendanceSource: AttendanceSource;
  biometricCode: string | null;
  attendanceSourceFrom: string | null;
  lastPunchAt: string | null;
}

/** GET /biometric/people (4.0: the organisation in view; no companyId). */
export interface AttendancePeopleQuery {
  search?: string;
  source?: AttendanceSource;
}

export interface SetAttendanceItem {
  userId: string;
  attendanceSource?: AttendanceSource;
  biometricCode?: string | null;
}

export interface PunchView {
  id: string;
  code: string;
  punchedAt: string;
  direction: PunchDirection | null;
  deviceId: string;
  source: PunchSource;
  userId: string | null;
  userName: string | null;
  dayKey: string;
  note: string | null;
  addedBy: string | null;
  lockedOut: boolean;
  voided: boolean;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  receivedAt: string;
}

export interface PunchesQuery {
  from?: string;
  to?: string;
  userId?: string;
  code?: string;
  deviceId?: string;
  unmatched?: boolean;
  includeVoided?: boolean;
  limit?: number;
}

export interface IngestResult {
  received: number;
  stored: number;
  duplicates: number;
  unmatched: number;
  lockedOut: number;
  daysUpdated: number;
  ignored: { index: number; reason: string }[];
}

export interface UnmatchedCodeView {
  code: string;
  codeKey: string;
  punches: number;
  firstAt: string;
  lastAt: string;
  devices: string[];
}

export interface DeviceView {
  deviceId: string;
  punches: number;
  punchesToday: number;
  lastPunchAt: string;
  lastReceivedAt: string;
}

export interface KeyView {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  revokedAt: string | null;
  active: boolean;
}

export type GapRule = "SPAN" | "PAIRS";
export type MissingCheckoutRule = "LAST_PUNCH" | "SHIFT_END";
export type AuthType = "NONE" | "BEARER" | "TOKEN" | "JWT" | "HEADER" | "BASIC" | "LOGIN";
export type TimeFormat = "AUTO" | "ISO" | "LOCAL" | "EPOCH_S" | "EPOCH_MS";
export type PullPreset = "GENERIC" | "BIOTIME";

export interface PullConfig {
  enabled: boolean;
  preset: PullPreset;
  url: string;
  authType: AuthType;
  authHeader: string;
  username: string;
  loginUrl: string;
  tokenPath: string;
  tokenScheme: string;
  sinceParam: string;
  untilParam: string;
  queryTimeFormat: TimeFormat;
  listPath: string;
  nextPath: string;
  fields: { code: string; time: string; direction: string; deviceId: string; externalId: string };
  timeFormat: TimeFormat;
  inWords: string[];
  outWords: string[];
  everyMin: number;
  overlapMin: number;
}

export interface BiometricSettingsView {
  gapRule: GapRule;
  missingCheckout: MissingCheckoutRule;
  duplicateWindowSec: number;
  pushInWords: string[];
  pushOutWords: string[];
  pull: PullConfig;
  secretSet: boolean;
  passwordSet: boolean;
  bounds: Record<string, { min: number; max: number }>;
}

export interface BiometricSettingsPatch {
  gapRule?: GapRule;
  missingCheckout?: MissingCheckoutRule;
  duplicateWindowSec?: number;
  pushInWords?: string[];
  pushOutWords?: string[];
  pull?: Partial<Omit<PullConfig, "fields">> & { fields?: Partial<PullConfig["fields"]> };
  secret?: string | null;
  password?: string | null;
}

export interface PullState {
  lastRunAt: string | null;
  lastOkAt: string | null;
  lastError: string | null;
  lastCount: number;
  cursor: string | null;
}

export interface BiometricStatusView {
  keys: { active: number; total: number };
  lastPunchAt: string | null;
  lastReceivedAt: string | null;
  punchesToday: number;
  unmatchedCodes: number;
  people: { biometric: number; agent: number; withoutCode: number };
  pull: { enabled: boolean; preset: PullPreset } & PullState;
  pushPath: string;
}

export interface PullRunResult {
  ok: boolean;
  read: number;
  pages: number;
  from: string;
  to: string;
  sample?: {
    code: unknown;
    time: unknown;
    direction: unknown;
    deviceId: unknown;
    externalId: unknown;
  }[];
  stored?: IngestResult;
  error?: string;
}
