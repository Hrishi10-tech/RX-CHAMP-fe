/**
 * Leave (3.4), as the API answers it (docs/3.4/API.md). Amounts are days in
 * quarter steps (0.25, 0.5, 1, 2.75); a debt is negative.
 */

export type LeaveCategory = "CLSL" | "ELPL";
export type LeaveKind = "FULL_DAY" | "HALF_DAY" | "QUARTER_DAY";
export type LeavePart = "FIRST_HALF" | "SECOND_HALF" | "Q1" | "Q2" | "Q3" | "Q4";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REVOKED";
export type ApproverRoute = "MANAGER" | "SUPER_MANAGER" | "SUPER_ADMIN";
export type DeciderRole = ApproverRoute;

export interface LeaveRequestView {
  id: string;
  userId: string;
  userName: string;
  department: string | null;
  companyId: string | null;
  companyName: string | null;
  category: LeaveCategory;
  categoryLabel: string;
  kind: LeaveKind;
  part: LeavePart | null;
  kindLabel: string;
  startDate: string;
  endDate: string;
  span: string;
  year: number;
  days: number;
  daysLabel: string;
  dates: { date: string; label: string; days: number }[];
  partTimes: string | null;
  reason: string;
  status: LeaveStatus;
  statusLabel: string;
  approverRole: DeciderRole | null;
  waitingFor: string | null;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  can: { cancel: boolean; decide: boolean; revoke: boolean };
}

export interface CategoryBalanceView {
  category: LeaveCategory;
  label: string;
  name: string;
  year: number;
  grantedDays: number;
  grantSource: "DEFAULT" | "PERSON";
  prorated: boolean;
  carriedDays: number;
  lapsedDays: number;
  adjustedDays: number;
  takenDays: number;
  pendingDays: number;
  balanceDays: number;
  availableDays: number;
  spendableDays: number;
  yearEnd: "LAPSES" | "CARRIES";
  carryCapDays: number | null;
}

export interface LedgerLine {
  date: string;
  kind: "GRANT" | "CARRY" | "ADJUSTMENT" | "QUOTA" | "LEAVE" | "PENDING";
  category: LeaveCategory;
  days: number;
  text: string;
  byName: string | null;
  requestId: string | null;
  at: string | null;
}

export interface LeavePolicyView {
  enabled: boolean;
  clslDaysPerYear: number;
  elplDaysPerYear: number;
  elplCarryCapDays: number | null;
  elplNoticeDays: number;
  clslBackdateDays: number;
  approver: ApproverRoute;
  approverLabel: string;
  prorateJoiners: boolean;
  startedOn: string;
  year: number;
  routes: { value: ApproverRoute; label: string }[];
  categories: {
    category: LeaveCategory;
    label: string;
    name: string;
    daysPerYear: number;
    yearEnd: "LAPSES" | "CARRIES";
    rule: string;
  }[];
  kinds: {
    kind: LeaveKind;
    label: string;
    days: number;
    parts: { part: LeavePart; label: string }[];
  }[];
  bounds: Record<string, { min: number; max: number }>;
  canEdit: boolean;
  canRoute: boolean;
}

export interface MyLeaveView {
  today: string;
  timezone: string;
  year: number;
  policy: LeavePolicyView;
  balances: CategoryBalanceView[];
  nextYear: { year: number; balances: CategoryBalanceView[] } | null;
  waitingFor: string | null;
  upcoming: LeaveRequestView[];
  requests: LeaveRequestView[];
  ledger: LedgerLine[];
}

export interface LeaveDraft {
  category: LeaveCategory;
  kind: LeaveKind;
  part: LeavePart | null;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeavePreview {
  ok: boolean;
  problem: { field: string; code: string; message: string } | null;
  category: LeaveCategory | null;
  kind: LeaveKind | null;
  part: LeavePart | null;
  startDate: string | null;
  endDate: string | null;
  year: number | null;
  dates: { date: string; label: string; charged: boolean; days: number; why: string | null }[];
  days: number;
  daysLabel: string;
  partTimes: string | null;
  balance: { category: LeaveCategory; label: string; beforeDays: number; afterDays: number } | null;
  waitingFor: string | null;
  approvedAtOnce: boolean;
}

export interface LeavePersonRef {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  companyId: string | null;
  companyName: string | null;
  managerId: string | null;
  managerName: string | null;
}

export interface PersonBalanceRow {
  user: LeavePersonRef;
  year: number;
  clsl: CategoryBalanceView;
  elpl: CategoryBalanceView;
  quota: { clslDaysPerYear: number | null; elplDaysPerYear: number | null };
  upcomingDays: number;
}

export interface PersonLeaveView extends PersonBalanceRow {
  balances: CategoryBalanceView[];
  ledger: LedgerLine[];
  requests: LeaveRequestView[];
  canAdjust: boolean;
}

export interface LeaveAdjustmentView {
  id: string;
  userId: string;
  userName: string;
  companyName: string | null;
  year: number;
  category: LeaveCategory;
  categoryLabel: string;
  mode: "ADD" | "SUBTRACT" | "SET" | "QUOTA";
  days: number;
  label: string;
  reason: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface LeaveListParams {
  status?: string;
  userId?: string;
  companyId?: string;
  managerId?: string;
  from?: string;
  to?: string;
  category?: LeaveCategory;
  needsMe?: boolean;
  limit?: number;
}

export interface LeaveList {
  items: LeaveRequestView[];
  summary: { pending: number; needsMe: number };
}

export interface AdjustLeaveInput {
  userId: string;
  category: LeaveCategory;
  year?: number;
  mode: "ADD" | "SUBTRACT" | "SET";
  days: number;
  reason: string;
}

export type LeavePolicyPatch = Partial<
  Pick<
    LeavePolicyView,
    | "enabled"
    | "clslDaysPerYear"
    | "elplDaysPerYear"
    | "elplCarryCapDays"
    | "elplNoticeDays"
    | "clslBackdateDays"
    | "approver"
    | "prorateJoiners"
  >
> & { applyNow?: boolean };

/** What a day carries about leave in Team today, the agent's day and reports. */
export interface DayLeaveView {
  days: number;
  full: boolean;
  label: string;
  categories: string;
  clslDays?: number;
  elplDays?: number;
  pendingDays: number;
  mask: number;
}
