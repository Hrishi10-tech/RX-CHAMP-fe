"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useOrgScope } from "@/lib/org/selection";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
} from "@/features/departments/api/departments";
import type { DepartmentInput } from "@/features/departments/types";

export const departmentKeys = {
  all: ["departments"] as const,
  list: (org: string) => [...departmentKeys.all, org, "list"] as const,
};

/** Every department the viewer may see (a manager: theirs), sorted by name. */
export function useDepartments(enabled = true) {
  const org = useOrgScope();
  return useQuery({
    queryKey: departmentKeys.list(org),
    queryFn: getDepartments,
    enabled,
    staleTime: 60_000,
  });
}

/** After any department change, everything that shows departments re-reads. */
function useInvalidateDepartments() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: departmentKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["users"] }),
      queryClient.invalidateQueries({ queryKey: ["team"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
      queryClient.invalidateQueries({ queryKey: ["idle-settings"] }),
    ]);
}

export function useSaveDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: DepartmentInput }) =>
      id ? updateDepartment(id, input) : createDepartment(input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => invalidate(),
  });
}
