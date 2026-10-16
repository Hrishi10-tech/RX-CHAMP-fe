import { apiClient, type ApiResponse } from "@/lib/api";
import type { MyBreakHistoryView } from "@/features/breaks/types";

/** The signed-in person's breaks over the last `days` days (max 31), newest first. */
export async function getMyBreakHistory(days = 14): Promise<MyBreakHistoryView> {
  const { data } = await apiClient.get<ApiResponse<MyBreakHistoryView>>(
    "/api/v1/breaks/me/history",
    { params: { days } },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load your break history");
  }

  return data.data;
}
