import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import type { UserHourlyView } from "@/features/activity/types/hourly";

/**
 * `GET /activity/user/:userId/hourly?date=`: one person's active minutes by hour.
 * A Manager for their own reports, a Super Admin for anyone; Staff get 403, even
 * for themselves, so never call this from a staff screen.
 */
export async function getUserHourly(userId: string, date?: string): Promise<UserHourlyView> {
  const { data } = await apiClient.get<ApiResponse<UserHourlyView>>(
    `/api/v1/activity/user/${encodeURIComponent(userId)}/hourly`,
    { params: date ? { date } : {} },
  );
  const view = unwrap(data, "Failed to load activity by hour");
  return { ...view, hours: Array.isArray(view.hours) ? view.hours : [] };
}
