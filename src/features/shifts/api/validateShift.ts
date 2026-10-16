import { apiClient, type ApiResponse } from "@/lib/api";
import type { ShiftValidationView, UpsertShiftInput } from "@/features/shifts/types";

/**
 * Checks a shift definition without saving it. Returns the problems the editor
 * shows live and every break's derived times (end, window, ring). Super Admin only.
 */
export async function validateShift(
  input: UpsertShiftInput,
  signal?: AbortSignal,
): Promise<ShiftValidationView> {
  const { data } = await apiClient.post<ApiResponse<ShiftValidationView>>(
    "/api/v1/shifts/validate",
    input,
    { signal },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to check the shift");
  }

  return data.data;
}
