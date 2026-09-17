import { apiClient, type ApiResponse } from "@/lib/api";
import type { UpdatedCompany } from "@/features/companies/types";

/** Renames a company. The name is the only field a company holds of its own. */
export async function updateCompany(id: string, name: string): Promise<UpdatedCompany> {
  const { data } = await apiClient.patch<ApiResponse<UpdatedCompany>>(
    `/api/v1/companies/${id}`,
    { name },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to rename company");
  }

  return data.data;
}
