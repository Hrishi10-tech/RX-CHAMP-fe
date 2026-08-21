import { apiClient, type ApiResponse } from "@/lib/api";
import type { User } from "@/features/users/types";

/**
 * Turns a user's automatic screenshots on or off. Admins may set it for anyone, a
 * manager for their own reports.
 *
 * Only the agent's periodic capture is affected — activity tracking keeps running,
 * and a manual capture requested from the screenshots timeline still works.
 */
export async function setUserScreenshots(id: string, enabled: boolean): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<User>>(
    `/api/v1/users/${id}/screenshots`,
    { enabled },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to update screenshot setting");
  }

  return data.data;
}
