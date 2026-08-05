import { apiClient, type ApiResponse } from "@/lib/api";
import type {
  CompanyUser,
  GetManagerUsersParams,
  ManagerUsersResult,
} from "@/features/companies/types";

export async function getManagerUsers(
  companyId: string,
  managerId: string,
  params: GetManagerUsersParams = {},
): Promise<ManagerUsersResult> {
  const { data } = await apiClient.get<ApiResponse<CompanyUser[]>>(
    `/api/v1/companies/${companyId}/managers/${managerId}/users`,
    { params },
  );

  return { users: data.data ?? [], meta: data.meta };
}
