import { apiClient, type ApiResponse } from "@/lib/api";
import type { UpdateUserInput, User } from "@/features/users/types";

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<User>>(`/api/v1/users/${id}`, input);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to update member");
  }

  return data.data;
}
