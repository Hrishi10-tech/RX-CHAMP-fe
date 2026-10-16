import { apiClient, type ApiResponse } from "@/lib/api";
import type { PresenceStatus } from "@/features/analytics/types";

/** `GET /presence/me/current` and `GET /presence/team/:userId/current`. */
export interface MemberPresence {
  status: PresenceStatus;
  /** The open presence session (break, lunch, meeting), when there is one. */
  sessionId?: string | null;
  note: string | null;
  since: string | null;
  elapsedSec: number;
}

/**
 * One person's current presence (WORKING / BREAK / LUNCH / MEETING). Your own
 * comes from `/presence/me/current` (any role); someone else's from
 * `/presence/team/:userId/current` (their manager, or a Super Admin for anyone).
 */
export async function getMemberPresence(
  userId: string,
  self: boolean,
): Promise<MemberPresence | null> {
  const url = self
    ? "/api/v1/presence/me/current"
    : `/api/v1/presence/team/${encodeURIComponent(userId)}/current`;
  const { data } = await apiClient.get<ApiResponse<MemberPresence>>(url);
  return data.data ?? null;
}
