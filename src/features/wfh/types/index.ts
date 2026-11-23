import type { LeaveKind, LeavePart, LeaveStatus, ApproverRoute } from "@/features/leave/types";

/**
 * Work from home (3.5 on 4.0): the shapes of the 4.0 API's `/wfh` answers
 * (backend `src/modules/wfh/application/wfh.views.ts`). Amounts in days, quarter-day
 * steps. On "All organisations" every row names its organisation (companyName).
 */

/** Who a request waits on (4.0 adds the organisation's ADMIN to 3.5's routes). */
export type WfhDeciderRole = ApproverRoute | "ADMIN";

export type AttendanceSource = "AGENT" | "BIOMETRIC";
export type CreditBasis = "SHIFT_LENGTH" | "EXPECTED";
export type WfhSource = "REQUEST" | "SCHEDULE" | "BOTH";

export interface WfhRequestView {
  id: string;
  userId: string;
  userName: string;
  /** 3.6: the person's effective avatar; null while they have no gender. */
  avatarId?: string | null;
  department: string | null;
  companyId: string | null;
  companyName: string | null;
  attendanceSource: AttendanceSource;
  kind: LeaveKind;
  part: LeavePart | null;
  kindLabel: string;
  startDate: string;
  endDate: string;
  span: string;
  days: number;
  daysLabel: string;
  dates: { date: string; label: string; days: number }[];
  /** Part days: when on the shift, "09:30 to 14:00" (24-hour; shown with partTimesText). */
  partTimes: string | null;
  reason: string;
  status: LeaveStatus;
  statusLabel: string;
  approverRole: WfhDeciderRole | null;
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

export interface WfhDraft {
  kind: LeaveKind;
  part: LeavePart | null;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface WfhPreview {
  ok: boolean;
  problem: { field: string; code: string; message: string } | null;
  kind: LeaveKind | null;
  part: LeavePart | null;
  startDate: string | null;
  endDate: string | null;
  dates: { date: string; label: string; covered: boolean; days: number; why: string | null }[];
  days: number;
  daysLabel: string;
  partTimes: string | null;
  waitingFor: string | null;
  approvedAtOnce: boolean;
  tracking: string;
  capPerDaySec: number | null;
}

export interface WfhScheduleView {
  id: string;
  userId: string;
  userName: string;
  /** 3.6: the person's effective avatar; null while they have no gender. */
  avatarId?: string | null;
  department: string | null;
  companyName: string | null;
  weekdays: number[];
  weeks: number[];
  kind: LeaveKind;
  part: LeavePart | null;
  label: string;
  fromDate: string;
  toDate: string | null;
  skipDates: string[];
  note: string;
  state: "ACTIVE" | "UPCOMING" | "ENDED";
  next: { date: string; label: string }[];
  createdByName: string;
  updatedAt: string;
  can: { edit: boolean };
}

export interface WfhScheduleInput {
  userId: string;
  weekdays: number[];
  weeks: number[];
  kind: LeaveKind;
  part: LeavePart | null;
  fromDate: string;
  toDate: string;
  note: string;
}

export interface WfhPolicyView {
  enabled: boolean;
  noticeDays: number;
  maxDaysPerMonth: number | null;
  approver: ApproverRoute;
  approverLabel: string;
  creditBasis: CreditBasis;
  creditBasisLabel: string;
  routes: { value: ApproverRoute; label: string }[];
  bases: { value: CreditBasis; label: string }[];
  bounds: Record<string, { min: number; max: number }>;
  rule: string;
  /** 4.0: the organisation's admins (its Admin, a Super Admin inside it) change its policy. */
  canEdit: boolean;
  canRoute: boolean;
}

export type WfhPolicyPatch = Partial<
  Pick<WfhPolicyView, "enabled" | "noticeDays" | "maxDaysPerMonth" | "approver" | "creditBasis">
>;

export interface MyWfhView {
  today: string;
  attendanceSource: AttendanceSource;
  todayWfh: { days: number; label: string; source: string; capSec: number } | null;
  upcoming: WfhRequestView[];
  requests: WfhRequestView[];
  schedules: WfhScheduleView[];
  thisMonth: { days: number; waitingDays: number; capDays: number | null };
  waitingFor: string | null;
  policy: WfhPolicyView;
}

/**
 * `GET /wfh/requests` filters. 4.0: the organisation in view travels as X-Org-Id;
 * `companyId` only narrows "All organisations" to one. Scope is by department, so
 * there is no 3.5 `managerId` (one manager's team) filter.
 */
export interface WfhListParams {
  /** PENDING, APPROVED, REJECTED, CANCELLED, REVOKED; comma-separated. */
  status?: string;
  userId?: string;
  companyId?: string;
  from?: string;
  to?: string;
  needsMe?: boolean;
  limit?: number;
}

export interface WfhList {
  items: WfhRequestView[];
  summary: { pending: number; needsMe: number };
}

/** What a day carries about work from home in Team today and the person's day (3.5). */
export interface WorkdayWfhView {
  days: number;
  label: string;
  source: string;
  sourceLabel: string;
  mask: number;
  pendingDays: number;
  capSec: number;
  canStart: boolean;
  canEnd: boolean;
  startBlocked: string | null;
}
