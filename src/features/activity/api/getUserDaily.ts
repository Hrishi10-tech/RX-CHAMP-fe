import { apiClient, type ApiResponse } from "@/lib/api";
import type { DailyActivity } from "@/features/activity/types";

export async function getUserDaily(userId: string, date: string): Promise<DailyActivity> {
  const { data } = await apiClient.get<ApiResponse<DailyActivity>>(
    `/api/v1/activity/user/${userId}/daily`,
    { params: { date } },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load daily activity");
  }

  return data.data;
}
