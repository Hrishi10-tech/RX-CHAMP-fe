import { apiClient, type ApiResponse } from "@/lib/api";
import type { ActivityTimeline } from "@/features/productivity/types";

export async function getActivityTimeline(userId: string, date: string): Promise<ActivityTimeline> {
  const { data } = await apiClient.get<ApiResponse<ActivityTimeline>>(
    `/api/v1/presence/team/${userId}/timeline`,
    { params: { date } },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load timeline");
  }

  return data.data;
}
