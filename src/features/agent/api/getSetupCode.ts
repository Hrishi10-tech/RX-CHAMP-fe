import { apiClient, type ApiResponse } from "@/lib/api";
import type { AgentSetupCode } from "@/features/agent/types";

/**
 * A setup code that signs the Mac agent in as this person (yourself, a Super
 * Admin for anyone else, a Manager for their own staff). It is a credential.
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
