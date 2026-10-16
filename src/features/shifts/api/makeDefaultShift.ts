import { apiClient, type ApiResponse } from "@/lib/api";
import type { ShiftView } from "@/features/shifts/types";

/** Makes this the shift for people with no department or personal shift. */
export async function makeDefaultShift(id: string): Promise<ShiftView> {
  const { data } = await apiClient.post<ApiResponse<ShiftView>>(`/api/v1/shifts/${id}/default`);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to change the default shift");
  }

  return data.data;
}
