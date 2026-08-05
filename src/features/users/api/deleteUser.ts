import { apiClient, type ApiResponse } from "@/lib/api";

export async function deleteUser(id: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/api/v1/users/${id}`);

  if (!data.success) {
    throw new Error(data.message ?? "Failed to delete member");
  }
}
