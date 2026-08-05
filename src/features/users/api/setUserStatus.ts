import { apiClient, type ApiResponse } from "@/lib/api";
import type { User, UserStatus } from "@/features/users/types";

export async function setUserStatus(id: string, status: UserStatus): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<User>>(`/api/v1/users/${id}/status`, {
    status,
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to update member status");
  }

  return data.data;
}
