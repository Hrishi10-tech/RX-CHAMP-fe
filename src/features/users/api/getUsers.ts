import { apiClient, type ApiResponse } from "@/lib/api";
import type { GetUsersParams, User, UsersResult } from "@/features/users/types";

export async function getUsers(params: GetUsersParams = {}): Promise<UsersResult> {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );

  const { data } = await apiClient.get<ApiResponse<User[]>>("/api/v1/users", {
    params: query,
  });

  return { users: data.data ?? [], meta: data.meta };
}
