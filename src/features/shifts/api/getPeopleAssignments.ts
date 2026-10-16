import { apiClient, type ApiResponse, type PaginationMeta } from "@/lib/api";
import type { GetPeopleAssignmentsParams, PersonShiftView } from "@/features/shifts/types";

export interface PeopleAssignmentsResult {
  people: PersonShiftView[];
  meta?: PaginationMeta;
}

/** People and the shift that applies to them today. A Manager sees their own staff. */
export async function getPeopleAssignments(
  params: GetPeopleAssignmentsParams = {},
): Promise<PeopleAssignmentsResult> {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );

  const { data } = await apiClient.get<ApiResponse<PersonShiftView[]>>(
    "/api/v1/shift-assignments/people",
    { params: query },
  );

  if (!data.success) {
    throw new Error(data.message ?? "Failed to load people");
  }

  return { people: data.data ?? [], meta: data.meta };
}
