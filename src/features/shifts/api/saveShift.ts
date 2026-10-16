import { apiClient, type ApiResponse } from "@/lib/api";
import type { ShiftView, UpsertShiftInput } from "@/features/shifts/types";

/**
 * Creates a shift. 400 SHIFT_INVALID carries `details.problems`; 409 means the name
 * is taken. The very first shift becomes the default.
 */
export async function createShift(input: UpsertShiftInput): Promise<ShiftView> {
  const { data } = await apiClient.post<ApiResponse<ShiftView>>("/api/v1/shifts", input);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to create the shift");
  }

  return data.data;
}

/**
 * Replaces a shift's definition. Breaks already taken keep the schedule they were
 * taken under. Send the shift's companyId back unchanged: an omitted one means
 * "every company".
 */
export async function updateShift(id: string, input: UpsertShiftInput): Promise<ShiftView> {
  const { data } = await apiClient.put<ApiResponse<ShiftView>>(`/api/v1/shifts/${id}`, input);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to save the shift");
  }

  return data.data;
}
