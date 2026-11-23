import { apiClient, type ApiResponse } from "@/lib/api";
import { cleanParams, readItems, unwrap } from "@/lib/api/list";
import type {
  MyWfhView,
  WfhDraft,
  WfhList,
  WfhListParams,
  WfhPolicyPatch,
  WfhPolicyView,
  WfhPreview,
  WfhRequestView,
  WfhScheduleInput,
  WfhScheduleView,
} from "@/features/wfh/types";

/**
 * The 4.0 work-from-home API (backend `src/modules/wfh/presentation/wfh.controller.ts`).
 * The API client sends the organisation in view as X-Org-Id; with none ("All
 * organisations", Super Admin or Super Manager) the lists combine every
 * organisation and `companyId` may narrow them to one.
 */
const BASE = "/api/v1/wfh";

export type WfhDecisionMode = "approve" | "reject" | "revoke";

/** The body the API wants: no part on a full day, no last day on a part day. */
export function wfhRequestBody(d: WfhDraft) {
  return {
    kind: d.kind,
    part: d.kind === "FULL_DAY" ? undefined : (d.part ?? undefined),
    startDate: d.startDate,
    endDate:
      d.kind === "FULL_DAY" && d.endDate && d.endDate !== d.startDate ? d.endDate : undefined,
    reason: d.reason.trim().replace(/\s+/g, " "),
  };
}

export async function getMyWfh(): Promise<MyWfhView> {
  const { data } = await apiClient.get<ApiResponse<MyWfhView>>(`${BASE}/me`);
  return unwrap(data, "Failed to load your work from home");
}

export async function getWfhPolicy(): Promise<WfhPolicyView> {
  const { data } = await apiClient.get<ApiResponse<WfhPolicyView>>(`${BASE}/policy`);
  return unwrap(data, "Failed to load the work-from-home policy");
}

export async function patchWfhPolicy(
  patch: WfhPolicyPatch,
): Promise<{ policy: WfhPolicyView; changed: string[] }> {
  const { data } = await apiClient.patch<ApiResponse<{ policy: WfhPolicyView; changed: string[] }>>(
    `${BASE}/policy`,
    patch,
  );
  return unwrap(data, "Failed to save the policy");
}

export async function previewWfh(draft: WfhDraft): Promise<WfhPreview> {
  const { data } = await apiClient.post<ApiResponse<WfhPreview>>(
    `${BASE}/preview`,
    wfhRequestBody(draft),
  );
  return unwrap(data, "Failed to check the request");
}

export async function createWfh(draft: WfhDraft): Promise<WfhRequestView> {
  const { data } = await apiClient.post<ApiResponse<WfhRequestView>>(
    `${BASE}/requests`,
    wfhRequestBody(draft),
  );
  return unwrap(data, "Failed to ask for work from home");
}

export async function cancelWfh(id: string): Promise<WfhRequestView> {
  const { data } = await apiClient.post<ApiResponse<WfhRequestView>>(
    `${BASE}/requests/${encodeURIComponent(id)}/cancel`,
    {},
  );
  return unwrap(data, "Failed to cancel the request");
}

export async function decideWfh(
  id: string,
  mode: WfhDecisionMode,
  note?: string,
): Promise<WfhRequestView> {
  const { data } = await apiClient.post<ApiResponse<WfhRequestView>>(
    `${BASE}/requests/${encodeURIComponent(id)}/${mode}`,
    note && note.trim() ? { note: note.trim() } : {},
  );
  return unwrap(data, "Failed to save the decision");
}

export async function getWfhRequests(params: WfhListParams = {}): Promise<WfhList> {
  const { data } = await apiClient.get<ApiResponse<WfhList>>(`${BASE}/requests`, {
    params: cleanParams({
      status: params.status,
      userId: params.userId,
      companyId: params.companyId,
      from: params.from,
      to: params.to,
      needsMe: params.needsMe ? "true" : undefined,
      limit: params.limit,
    }),
  });
  const body = unwrap(data, "Failed to load the requests");
  return {
    items: readItems<WfhRequestView>(body),
    summary: body.summary ?? { pending: 0, needsMe: 0 },
  };
}

export async function getWfhSummary(
  companyId?: string,
): Promise<{ pending: number; needsMe: number }> {
  const { data } = await apiClient.get<ApiResponse<{ pending: number; needsMe: number }>>(
    `${BASE}/requests/summary`,
    { params: cleanParams({ companyId }) },
  );
  return unwrap(data, "Failed to load the work-from-home summary");
}

export async function getWfhSchedules(params: {
  userId?: string;
  companyId?: string;
  includeEnded?: boolean;
}): Promise<WfhScheduleView[]> {
  const { data } = await apiClient.get<ApiResponse<WfhScheduleView[]>>(`${BASE}/schedules`, {
    params: cleanParams({
      userId: params.userId,
      companyId: params.companyId,
      includeEnded: params.includeEnded ? "true" : undefined,
    }),
  });
  return readItems<WfhScheduleView>(unwrap(data, "Failed to load the schedules"));
}

function scheduleBody(input: Omit<WfhScheduleInput, "userId">) {
  return {
    weekdays: input.weekdays,
    weeks: input.weeks,
    kind: input.kind,
    part: input.kind === "FULL_DAY" ? undefined : (input.part ?? undefined),
    fromDate: input.fromDate,
    toDate: input.toDate || undefined,
    note: input.note.trim() || undefined,
  };
}

export async function createWfhSchedule(input: WfhScheduleInput): Promise<WfhScheduleView> {
  const { data } = await apiClient.post<ApiResponse<WfhScheduleView>>(`${BASE}/schedules`, {
    userId: input.userId,
    ...scheduleBody(input),
  });
  return unwrap(data, "Failed to set the schedule");
}

export async function updateWfhSchedule(
  id: string,
  input: Omit<WfhScheduleInput, "userId">,
): Promise<WfhScheduleView> {
  const { data } = await apiClient.put<ApiResponse<WfhScheduleView>>(
    `${BASE}/schedules/${encodeURIComponent(id)}`,
    scheduleBody(input),
  );
  return unwrap(data, "Failed to change the schedule");
}

export async function endWfhSchedule(id: string): Promise<{ ended: true; removed: boolean }> {
  const { data } = await apiClient.post<ApiResponse<{ ended: true; removed: boolean }>>(
    `${BASE}/schedules/${encodeURIComponent(id)}/end`,
    {},
  );
  return unwrap(data, "Failed to end the schedule");
}

export async function skipWfhScheduleDay(
  id: string,
  date: string,
  skip: boolean,
): Promise<WfhScheduleView> {
  const { data } = await apiClient.post<ApiResponse<WfhScheduleView>>(
    `${BASE}/schedules/${encodeURIComponent(id)}/skip`,
    { date, skip },
  );
  return unwrap(data, "Failed to change the schedule");
}
