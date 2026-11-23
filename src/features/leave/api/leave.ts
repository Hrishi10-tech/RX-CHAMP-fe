import { apiClient, type ApiResponse } from "@/lib/api";
import { cleanParams, readItems, unwrap } from "@/lib/api/list";
import type {
  AdjustLeaveInput,
  LeaveAdjustmentView,
  LeaveDraft,
  LeaveList,
  LeaveListParams,
  LeavePolicyPatch,
  LeavePolicyView,
  LeavePreview,
  LeaveRequestView,
  MyLeaveView,
  PersonBalanceRow,
  PersonLeaveView,
} from "@/features/leave/types";

const BASE = "/api/v1/leave";

/** The body the API wants: no part on a full day, no last day on a part day. */
export function requestBody(d: LeaveDraft) {
  return {
    category: d.category,
    kind: d.kind,
    part: d.kind === "FULL_DAY" ? undefined : (d.part ?? undefined),
    startDate: d.startDate,
    endDate:
      d.kind === "FULL_DAY" && d.endDate && d.endDate !== d.startDate ? d.endDate : undefined,
    reason: d.reason.trim().replace(/\s+/g, " "),
  };
}

export async function getMyLeave(year?: number): Promise<MyLeaveView> {
  const { data } = await apiClient.get<ApiResponse<MyLeaveView>>(`${BASE}/me`, {
    params: cleanParams({ year }),
  });
  return unwrap(data, "Failed to load your leave");
}

export async function getLeavePolicy(): Promise<LeavePolicyView> {
  const { data } = await apiClient.get<ApiResponse<LeavePolicyView>>(`${BASE}/policy`);
  return unwrap(data, "Failed to load the leave policy");
}

export async function patchLeavePolicy(
  patch: LeavePolicyPatch,
): Promise<{ policy: LeavePolicyView; changed: string[]; accountsUpdated: number }> {
  const { data } = await apiClient.patch<
    ApiResponse<{ policy: LeavePolicyView; changed: string[]; accountsUpdated: number }>
  >(`${BASE}/policy`, patch);
  return unwrap(data, "Failed to save the leave policy");
}

export async function previewLeave(draft: LeaveDraft): Promise<LeavePreview> {
  const { data } = await apiClient.post<ApiResponse<LeavePreview>>(
    `${BASE}/preview`,
    requestBody(draft),
  );
  return unwrap(data, "Failed to check the request");
}

export async function createLeave(draft: LeaveDraft): Promise<LeaveRequestView> {
  const { data } = await apiClient.post<ApiResponse<LeaveRequestView>>(
    `${BASE}/requests`,
    requestBody(draft),
  );
  return unwrap(data, "Failed to apply for leave");
}

export async function cancelLeave(id: string): Promise<LeaveRequestView> {
  const { data } = await apiClient.post<ApiResponse<LeaveRequestView>>(
    `${BASE}/requests/${encodeURIComponent(id)}/cancel`,
    {},
  );
  return unwrap(data, "Failed to cancel the request");
}

export type DecisionMode = "approve" | "reject" | "revoke";

export async function decideLeave(
  id: string,
  mode: DecisionMode,
  note?: string,
): Promise<LeaveRequestView> {
  const { data } = await apiClient.post<ApiResponse<LeaveRequestView>>(
    `${BASE}/requests/${encodeURIComponent(id)}/${mode}`,
    note && note.trim() ? { note: note.trim() } : {},
  );
  return unwrap(data, "Failed to save the decision");
}

export async function getLeaveRequests(params: LeaveListParams = {}): Promise<LeaveList> {
  const { data } = await apiClient.get<ApiResponse<LeaveList>>(`${BASE}/requests`, {
    params: cleanParams({
      status: params.status,
      userId: params.userId,
      companyId: params.companyId,
      managerId: params.managerId,
      from: params.from,
      to: params.to,
      category: params.category,
      needsMe: params.needsMe ? "true" : undefined,
      limit: params.limit,
    }),
  });
  const body = unwrap(data, "Failed to load leave requests");
  return {
    items: readItems<LeaveRequestView>(body),
    summary: body.summary ?? { pending: 0, needsMe: 0 },
  };
}

export async function getLeaveSummary(
  companyId?: string,
): Promise<{ pending: number; needsMe: number }> {
  const { data } = await apiClient.get<ApiResponse<{ pending: number; needsMe: number }>>(
    `${BASE}/requests/summary`,
    { params: cleanParams({ companyId }) },
  );
  return unwrap(data, "Failed to load the leave summary");
}

export async function getLeaveBalances(params: {
  year?: number;
  companyId?: string;
  managerId?: string;
  search?: string;
}): Promise<{ year: number; rows: PersonBalanceRow[]; canAdjust: boolean }> {
  const { data } = await apiClient.get<
    ApiResponse<{ year: number; rows: PersonBalanceRow[]; canAdjust: boolean }>
  >(`${BASE}/balances`, { params: cleanParams(params) });
  return unwrap(data, "Failed to load leave balances");
}

export async function getPersonLeave(userId: string, year?: number): Promise<PersonLeaveView> {
  const { data } = await apiClient.get<ApiResponse<PersonLeaveView>>(
    `${BASE}/balances/${encodeURIComponent(userId)}`,
    { params: cleanParams({ year }) },
  );
  return unwrap(data, "Failed to load this person's leave");
}

export async function setLeaveQuota(
  userId: string,
  body: { clslDaysPerYear?: number | null; elplDaysPerYear?: number | null },
): Promise<PersonLeaveView> {
  const { data } = await apiClient.put<ApiResponse<PersonLeaveView>>(
    `${BASE}/quotas/${encodeURIComponent(userId)}`,
    body,
  );
  return unwrap(data, "Failed to save the yearly days");
}

export async function adjustLeave(
  input: AdjustLeaveInput,
): Promise<{ adjustment: LeaveAdjustmentView; person: PersonLeaveView }> {
  const { data } = await apiClient.post<
    ApiResponse<{ adjustment: LeaveAdjustmentView; person: PersonLeaveView }>
  >(`${BASE}/adjustments`, input);
  return unwrap(data, "Failed to change the balance");
}

export async function getLeaveAdjustments(params: {
  userId?: string;
  year?: number;
  companyId?: string;
  limit?: number;
}): Promise<LeaveAdjustmentView[]> {
  const { data } = await apiClient.get<ApiResponse<LeaveAdjustmentView[]>>(`${BASE}/adjustments`, {
    params: cleanParams(params),
  });
  return readItems<LeaveAdjustmentView>(unwrap(data, "Failed to load the adjustments"));
}
