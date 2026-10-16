import { apiClient, type ApiResponse } from "@/lib/api";
import type { AssignDepartmentInput, DepartmentAssignmentView } from "@/features/shifts/types";

/**
 * Sets a department's shift from a day onward (today or later; the past never
 * changes). Super Admin only. Returns the refreshed department list.
 */
export async function assignDepartment(
  input: AssignDepartmentInput,
): Promise<DepartmentAssignmentView[]> {
  const { data } = await apiClient.put<ApiResponse<DepartmentAssignmentView[]>>(
    "/api/v1/shift-assignments/departments",
    input,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to set the department's shift");
  }

  return data.data;
}
