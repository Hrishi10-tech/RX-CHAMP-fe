import type { GetPeopleAssignmentsParams, UpsertShiftInput } from "@/features/shifts/types";

/** React Query keys for shifts and assignments, so mutations can invalidate precisely. */
export const shiftKeys = {
  all: ["shifts"] as const,
  list: () => [...shiftKeys.all, "list"] as const,
  detail: (id: string) => [...shiftKeys.all, "detail", id] as const,
  validate: (body: UpsertShiftInput) => [...shiftKeys.all, "validate", body] as const,
};

export const assignmentKeys = {
  all: ["shift-assignments"] as const,
  departments: () => [...assignmentKeys.all, "departments"] as const,
  people: (params: GetPeopleAssignmentsParams) =>
    [...assignmentKeys.all, "people", params] as const,
};
