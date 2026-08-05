import { apiClient, type ApiResponse } from "@/lib/api";
import type { UserPresenceHistory } from "@/features/presence/types";

export async function getUserHistory(userId: string, days = 7): Promise<UserPresenceHistory> {
  const { data } = await apiClient.get<ApiResponse<UserPresenceHistory>>(
    `/api/v1/presence/team/${userId}/history`,
    { params: { days } },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load presence history");
  }

  return data.data;
}
