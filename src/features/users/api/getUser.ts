import { apiClient, type ApiResponse } from "@/lib/api";
import type { User } from "@/features/users/types";

/**
 * `GET /users/:id`: the full row for an Admin or Super Admin. A Manager gets the
 * brief row since 4.0 (id, name, email, designation and department: no role,
 * status or grants), so this is for the Admin's screens only; the portal asks it
 * of nobody else.
 */
export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get<ApiResponse<User>>(`/api/v1/users/${id}`);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load member");
  }

  return data.data;
}
