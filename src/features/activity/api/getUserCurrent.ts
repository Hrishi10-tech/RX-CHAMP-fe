import { apiClient, type ApiResponse } from "@/lib/api";
import type { CurrentActivity } from "@/features/activity/types";

export async function getUserCurrent(userId: string): Promise<CurrentActivity> {
  const { data } = await apiClient.get<ApiResponse<CurrentActivity>>(
    `/api/v1/activity/user/${userId}/current`,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load current activity");
  }

  return data.data;
}
