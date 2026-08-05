import { apiClient, type ApiResponse } from "@/lib/api";

export async function deleteUsers(ids: string[]): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<{ deleted: number }>>(
    "/api/v1/users/bulk-delete",
    { ids },
  );

  if (!data.success) {
    throw new Error(data.message ?? "Failed to delete members");
  }
}
