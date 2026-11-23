import { apiClient, type ApiResponse } from "@/lib/api";
import { cleanParams, readItems, unwrap } from "@/lib/api/list";
import type {
  CompOffCreditView,
  CompOffList,
  MyCompOffView,
  PersonCompOffView,
} from "@/features/leave/types";

/**
 * Comp off (3.5 on 4.0): the API's /leave/comp-off routes. The organisation in view
 * travels as X-Org-Id (the API client); "All organisations" lists every one.
 */
const BASE = "/api/v1/leave/comp-off";

export type CompOffDecisionMode = "approve" | "reject" | "revoke";

export async function getMyCompOff(): Promise<MyCompOffView> {
  const { data } = await apiClient.get<ApiResponse<MyCompOffView>>(`${BASE}/me`);
  return unwrap(data, "Failed to load your comp off");
}

export async function getPersonCompOff(userId: string): Promise<PersonCompOffView> {
  const { data } = await apiClient.get<ApiResponse<PersonCompOffView>>(
    `${BASE}/people/${encodeURIComponent(userId)}`,
  );
  return unwrap(data, "Failed to load their comp off");
}

export async function claimCompOff(input: {
  date: string;
  days?: number;
  reason: string;
}): Promise<CompOffCreditView> {
  const { data } = await apiClient.post<ApiResponse<CompOffCreditView>>(`${BASE}/claims`, {
    date: input.date,
    days: input.days,
    reason: input.reason.trim().replace(/\s+/g, " "),
  });
  return unwrap(data, "Failed to claim comp off");
}

export async function cancelCompOffClaim(id: string): Promise<CompOffCreditView> {
  const { data } = await apiClient.post<ApiResponse<CompOffCreditView>>(
    `${BASE}/claims/${encodeURIComponent(id)}/cancel`,
    {},
  );
  return unwrap(data, "Failed to cancel the claim");
}

export async function decideCompOff(
  id: string,
  mode: CompOffDecisionMode,
  body: { days?: number; note?: string },
): Promise<CompOffCreditView> {
  const { data } = await apiClient.post<ApiResponse<CompOffCreditView>>(
    `${BASE}/claims/${encodeURIComponent(id)}/${mode}`,
    {
      ...(body.days !== undefined ? { days: body.days } : {}),
      ...(body.note && body.note.trim() ? { note: body.note.trim() } : {}),
    },
  );
  return unwrap(data, "Failed to save the decision");
}

export async function grantCompOff(input: {
  userId: string;
  date: string;
  days: number;
  reason: string;
}): Promise<CompOffCreditView> {
  const { data } = await apiClient.post<ApiResponse<CompOffCreditView>>(`${BASE}/grants`, {
    ...input,
    reason: input.reason.trim().replace(/\s+/g, " "),
  });
  return unwrap(data, "Failed to credit comp off");
}

export async function getCompOffClaims(params: {
  status?: string;
  userId?: string;
  companyId?: string;
  needsMe?: boolean;
  limit?: number;
}): Promise<CompOffList> {
  const { data } = await apiClient.get<ApiResponse<CompOffList>>(`${BASE}/claims`, {
    params: cleanParams({
      status: params.status,
      userId: params.userId,
      companyId: params.companyId,
      needsMe: params.needsMe ? "true" : undefined,
      limit: params.limit,
    }),
  });
  const body = unwrap(data, "Failed to load comp off claims");
  return {
    items: readItems<CompOffCreditView>(body),
    summary: body.summary ?? { pending: 0, needsMe: 0 },
  };
}

export async function getCompOffSummary(
  companyId?: string,
): Promise<{ pending: number; needsMe: number }> {
  const { data } = await apiClient.get<ApiResponse<{ pending: number; needsMe: number }>>(
    `${BASE}/claims/summary`,
    {
      params: cleanParams({ companyId }),
    },
  );
  return unwrap(data, "Failed to load the comp off summary");
}
