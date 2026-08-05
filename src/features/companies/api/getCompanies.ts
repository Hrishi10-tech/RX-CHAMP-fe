import { apiClient, type ApiResponse } from "@/lib/api";
import type { Company, CompaniesResult, GetCompaniesParams } from "@/features/companies/types";

export async function getCompanies(params: GetCompaniesParams = {}): Promise<CompaniesResult> {
  const { data } = await apiClient.get<ApiResponse<Company[]>>("/api/v1/companies", { params });

  return { companies: data.data ?? [], meta: data.meta };
}
