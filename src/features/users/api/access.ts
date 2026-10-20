import { apiClient, type ApiResponse } from "@/lib/api";
import type { Grants } from "@/constants/roles";

/** SPEC 5.3 `POST /users/:id/grants` (Admin, Super Admin; the target is a Manager). */
export async function setUserGrants(id: string, grants: Grants): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    `/api/v1/users/${encodeURIComponent(id)}/grants`,
    grants,
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't save the access");
}

/**
 * SPEC 5.3 `POST /users/:id/idle {enabled, minutes}`: the person's input
 * tracking override. `enabled: null` goes back to the department's setting.
 */
export async function setUserIdle(
  id: string,
  setting: { enabled: boolean | null; minutes: number | null },
): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    `/api/v1/users/${encodeURIComponent(id)}/idle`,
    setting,
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't change input tracking");
}
