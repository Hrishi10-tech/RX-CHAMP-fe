import { apiClient, type ApiResponse } from "@/lib/api";
import type { DeletedShift } from "@/features/shifts/types";

/**
 * Deletes a shift that nobody is assigned to. 409 SHIFT_IS_DEFAULT for the
 * default shift, 409 SHIFT_IN_USE while a department or person is still on it;
 * both carry a message meant for the person.
 */
export async function deleteShift(id: string): Promise<DeletedShift> {
  const { data } = await apiClient.delete<ApiResponse<DeletedShift>>(`/api/v1/shifts/${id}`);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to delete the shift");
  }

  return data.data;
}
