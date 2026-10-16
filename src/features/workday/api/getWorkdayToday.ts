import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import type { WorkdayTodayView } from "@/features/workday/types";

export const WORKDAY_TODAY_URL = "/api/v1/workday/me/today";

/**
 * The signed-in person's day: Start Day state, sessions, focus time with what
 * pending approvals could still add or take off, and skips waiting for a comment.
 * Any role.
 */
export async function getWorkdayToday(): Promise<WorkdayTodayView> {
  const { data } = await apiClient.get<ApiResponse<WorkdayTodayView>>(WORKDAY_TODAY_URL);
  return unwrap(data, "Failed to load your day");
}
