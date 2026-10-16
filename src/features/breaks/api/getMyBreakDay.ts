import { apiClient, type ApiResponse } from "@/lib/api";
import type { MyBreakDayView } from "@/features/breaks/types";

/** Today's breaks for the signed-in person: times, windows, what was taken. */
export async function getMyBreakDay(): Promise<MyBreakDayView> {
  const { data } = await apiClient.get<ApiResponse<MyBreakDayView>>("/api/v1/breaks/me/today");

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load today's breaks");
  }

  return data.data;
}
