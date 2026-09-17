import { apiClient, type ApiResponse } from "@/lib/api";
import type { DeletedCompany } from "@/features/companies/types";

/**
 * Removes a company. Soft delete on the server: the company and any members still
 * attached stop being listed, and every record is kept — so the count that comes
 * back is what disappeared from the app, not what was destroyed.
 */
export async function deleteCompany(id: string): Promise<DeletedCompany> {
  const { data } = await apiClient.delete<ApiResponse<DeletedCompany>>(
    `/api/v1/companies/${id}`,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to delete company");
  }

  return data.data;
}
