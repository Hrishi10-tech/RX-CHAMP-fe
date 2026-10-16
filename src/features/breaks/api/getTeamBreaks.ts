import { apiClient, type ApiResponse } from "@/lib/api";
import type { GetTeamBreaksParams, TeamBreaksView } from "@/features/breaks/types";

/** One day of a team's breaks. A Manager gets their own staff; a Super Admin everyone or one team. */
export async function getTeamBreaks(params: GetTeamBreaksParams = {}): Promise<TeamBreaksView> {
  const query = Object.fromEntries(Object.entries(params).filter(([, v]) => Boolean(v)));

  const { data } = await apiClient.get<ApiResponse<TeamBreaksView>>("/api/v1/breaks/team", {
    params: query,
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load team breaks");
  }

  return data.data;
}
