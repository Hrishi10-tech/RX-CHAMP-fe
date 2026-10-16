"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { assignmentKeys } from "@/features/shifts/api/keys";
import { getDepartmentAssignments } from "@/features/shifts/api/getDepartmentAssignments";
import { assignDepartment } from "@/features/shifts/api/assignDepartment";
import { getPeopleAssignments } from "@/features/shifts/api/getPeopleAssignments";
import { assignPeople } from "@/features/shifts/api/assignPeople";
import { refreshScheduleData } from "@/features/shifts/hooks/useShifts";
import type {
  AssignDepartmentInput,
  AssignPeopleInput,
  GetPeopleAssignmentsParams,
} from "@/features/shifts/types";

export function useDepartmentAssignments(enabled = true) {
  return useQuery({
    queryKey: assignmentKeys.departments(),
    queryFn: getDepartmentAssignments,
    enabled,
  });
}

export function usePeopleAssignments(params: GetPeopleAssignmentsParams, enabled = true) {
  return useQuery({
    queryKey: assignmentKeys.people(params),
    queryFn: () => getPeopleAssignments(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useAssignDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignDepartmentInput) => assignDepartment(input),
    onSuccess: (departments) => {
      // The response is the refreshed list; show it at once, then re-read the rest.
      queryClient.setQueryData(assignmentKeys.departments(), departments);
      void refreshScheduleData(queryClient);
    },
  });
}

export function useAssignPeople() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignPeopleInput) => assignPeople(input),
    onSuccess: () => void refreshScheduleData(queryClient),
  });
}
