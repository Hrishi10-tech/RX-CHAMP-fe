import { apiClient, type ApiResponse } from "@/lib/api";
import type { DailyProductivity } from "@/features/productivity/types";

export async function getDailyProductivity(
  userId: string,
  date: string,
): Promise<DailyProductivity> {
  const { data } = await apiClient.get<ApiResponse<DailyProductivity>>(
    `/api/v1/productivity/${userId}`,
    { params: { date } },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load productivity");
  }

  return data.data;
}
