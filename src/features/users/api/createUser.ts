import { apiClient, type ApiResponse } from "@/lib/api";
import type { CreateUserInput, User } from "@/features/users/types";

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<User>>("/api/v1/users", input);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to create member");
  }

  return data.data;
}
