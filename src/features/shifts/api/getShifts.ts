import { apiClient, type ApiResponse } from "@/lib/api";
import type { ShiftView } from "@/features/shifts/types";

/** Every shift with its breaks and who it applies to today. Super Admin and Managers. */
export async function getShifts(): Promise<ShiftView[]> {
  const { data } = await apiClient.get<ApiResponse<ShiftView[]>>("/api/v1/shifts");

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load shifts");
  }

  return data.data;
}
