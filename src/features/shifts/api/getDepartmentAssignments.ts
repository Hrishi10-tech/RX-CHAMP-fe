import { apiClient, type ApiResponse } from "@/lib/api";
import type { DepartmentAssignmentView } from "@/features/shifts/types";

/**
 * Each department's shift today and any change scheduled. A Super Admin sees
 * every department; a Manager the departments their own staff are in.
 */
export async function getDepartmentAssignments(): Promise<DepartmentAssignmentView[]> {
  const { data } = await apiClient.get<ApiResponse<DepartmentAssignmentView[]>>(
    "/api/v1/shift-assignments/departments",
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load department shifts");
  }

  return data.data;
}
