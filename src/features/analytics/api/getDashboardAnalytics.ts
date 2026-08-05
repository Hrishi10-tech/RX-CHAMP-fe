import { apiClient, type ApiResponse } from "@/lib/api";
import type { DashboardAnalytics, RawDashboardAnalytics } from "@/features/analytics/types";
import { mapDashboard } from "@/features/analytics/lib/mapDashboard";

export async function getDashboardAnalytics(
  userId: string,
  date?: string,
): Promise<DashboardAnalytics> {
  const { data } = await apiClient.get<ApiResponse<RawDashboardAnalytics>>(
    `/api/v1/analytics/${userId}`,
    { params: date ? { date } : undefined },
  );

  if (data.success === false || !data.data) {
    throw new Error(data.message ?? "Failed to load dashboard analytics");
  }

  return mapDashboard(data.data);
}
