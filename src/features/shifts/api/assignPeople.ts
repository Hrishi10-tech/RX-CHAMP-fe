import { apiClient, type ApiResponse } from "@/lib/api";
import type { AssignPeopleInput, AssignPeopleResult } from "@/features/shifts/types";

/**
 * Overrides people's shift for a period, or sends them back to their department's
 * (shiftId null). People the caller may not change come back in `skipped` with a
 * reason; the rest are applied.
 */
export async function assignPeople(input: AssignPeopleInput): Promise<AssignPeopleResult> {
  const { data } = await apiClient.put<ApiResponse<AssignPeopleResult>>(
    "/api/v1/shift-assignments/people",
    input,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to change the shift");
  }

  return data.data;
}
