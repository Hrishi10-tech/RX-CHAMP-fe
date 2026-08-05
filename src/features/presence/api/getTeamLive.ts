import { apiClient, type ApiResponse } from "@/lib/api";
import type { TeamLiveMember } from "@/features/presence/types";

/**
 * Current presence (WORKING / BREAK / LUNCH / MEETING) for every report of the
 * signed-in manager. Used to seed a dashboard's status on load — `presence:update`
 * only fires on a change, so without this an ongoing break is invisible until the
 * next transition.
 */
export async function getTeamLive(): Promise<TeamLiveMember[]> {
  const { data } = await apiClient.get<ApiResponse<TeamLiveMember[]>>(
    "/api/v1/presence/team/live",
  );

  return data.data ?? [];
}
