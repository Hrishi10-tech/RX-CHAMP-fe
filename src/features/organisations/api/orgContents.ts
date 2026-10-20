import { apiClient, type ApiResponse } from "@/lib/api";
import { ORG_HEADER } from "@/lib/api/client";
import { readItems, readPage } from "@/lib/api/list";
import { readDepartment } from "@/features/departments/api/departments";
import type { DepartmentView } from "@/features/departments/types";
import type { User } from "@/features/users/types";

/**
 * One organisation's departments and people, for the Super Admin's
 * Organisations page (SPEC 1.2: the Super Admin sees every organisation with its
 * departments and users). Each request names the organisation itself with
 * X-Org-Id, so nothing has to be switched to look inside one.
 */
export async function getOrgDepartments(orgId: string): Promise<DepartmentView[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/departments", {
    headers: { [ORG_HEADER]: orgId },
  });
  if (!data?.success) throw new Error(data?.message ?? "Failed to load departments");
  return readItems<unknown>(data.data)
    .map(readDepartment)
    .filter((d): d is DepartmentView => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** People of one organisation, a page at a time (the API caps a page at 100). */
export async function getOrgPeople(
  orgId: string,
  page = 1,
): Promise<{ users: User[]; total: number; totalPages: number }> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/users", {
    params: { page, limit: 100, sort: "name_asc" },
    headers: { [ORG_HEADER]: orgId },
  });
  const { items, meta } = readPage<User>(data, "Couldn't load the people");
  return {
    users: items,
    total: meta?.total ?? items.length,
    totalPages: meta?.totalPages ?? 1,
  };
}
