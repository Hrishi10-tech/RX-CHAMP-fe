import { apiClient, type ApiResponse } from "@/lib/api";
import type { AgentSetupCode } from "@/features/agent/types";

/**
 * A setup code that signs the Mac agent in as this person. It is a credential:
 * 4.0 issues one only to an Admin (their organisation's Managers and Staff) or a
 * Super Admin, never for yourself (403).
 */
export async function getSetupCode(userId: string): Promise<AgentSetupCode> {
  const { data } = await apiClient.get<ApiResponse<AgentSetupCode>>("/api/v1/agent/setup-code", {
    params: { userId },
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to get a setup code");
  }

  return data.data;
}
