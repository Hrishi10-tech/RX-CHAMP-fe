import { apiClient, type ApiResponse } from "@/lib/api";
import type { ShiftView } from "@/features/shifts/types";

export async function getShift(id: string): Promise<ShiftView> {
  const { data } = await apiClient.get<ApiResponse<ShiftView>>(`/api/v1/shifts/${id}`);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load shift");
  }

  return data.data;
}
