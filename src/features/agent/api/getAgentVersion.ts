import { apiClient, type ApiResponse } from "@/lib/api";
import type { AgentPlatform, AgentVersionInfo } from "@/features/agent/types";

/** Version, file name and availability of the agent build for one platform. */
export async function getAgentVersion(platform: AgentPlatform): Promise<AgentVersionInfo> {
  const { data } = await apiClient.get<ApiResponse<AgentVersionInfo>>("/api/v1/agent/version", {
    params: { platform },
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load the agent version");
  }

  return data.data;
}
