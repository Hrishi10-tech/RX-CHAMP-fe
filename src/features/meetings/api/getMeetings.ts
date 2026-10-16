import { apiClient, type ApiResponse } from "@/lib/api";
import { readItems, unwrap } from "@/lib/api/list";
import type { MeetingRecordView, ParticipantOption } from "@/features/meetings/types";

/**
 * Read-only: the portal shows meetings (in Approvals and the reports) but never
 * starts or logs one. That happens in the desktop app.
 */

/** `GET /meetings/me/today`: the signed-in person's meetings today. */
export async function getMyMeetingsToday(): Promise<MeetingRecordView[]> {
  const { data } = await apiClient.get<ApiResponse<{ items: MeetingRecordView[] }>>(
    "/api/v1/meetings/me/today",
  );
  return readItems<MeetingRecordView>(unwrap(data, "Failed to load today's meetings"));
}

/** `GET /meetings/participants?q=`: active people in the caller's company, at most 50. */
export async function searchParticipants(q: string): Promise<ParticipantOption[]> {
  const { data } = await apiClient.get<ApiResponse<{ items: ParticipantOption[] }>>(
    "/api/v1/meetings/participants",
    { params: q.trim() ? { q: q.trim() } : {} },
  );
  return readItems<ParticipantOption>(unwrap(data, "Failed to search people"));
}
