import { apiClient } from "@/lib/api";
import type { CreateCompanyInput, CreatedCompany } from "@/features/companies/types";

export async function createCompany(input: CreateCompanyInput): Promise<CreatedCompany> {
  const { data } = await apiClient.post<{
    success: boolean;
    data?: CreatedCompany;
    message?: string;
  }>("/api/v1/companies", input);

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to create company");
  }

  return data.data;
}
