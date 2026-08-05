import { apiClient, type ApiResponse } from "@/lib/api";
import type { User } from "@/features/users/types";

export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get<ApiResponse<User>>(`/api/v1/users/${id}`);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load member");
  }

  return data.data;
}
