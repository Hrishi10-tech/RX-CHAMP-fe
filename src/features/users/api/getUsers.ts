import { apiClient, type ApiResponse } from "@/lib/api";
import { cleanParams, readPage } from "@/lib/api/list";
import type { GetUsersParams, User, UsersResult } from "@/features/users/types";

/**
 * SPEC 5.3 `GET /users?role&departmentId&q&status&page&limit` (Admin, Super
 * Admin: everyone in the organisation). Empty filters are left out.
 */
export function buildUsersQuery(params: GetUsersParams): Record<string, string | number | boolean> {
  return cleanParams({
    page: params.page,
    limit: params.limit,
    q: params.q?.trim(),
    role: params.role,
    departmentId: params.departmentId,
    status: params.status,
    sort: params.sort,
  });
}

export async function getUsers(params: GetUsersParams = {}): Promise<UsersResult> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/users", {
    params: buildUsersQuery(params),
  });
  const { items, meta } = readPage<User>(data, "Couldn't load members");
  return { users: items, meta };
}
