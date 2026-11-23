import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";

/** The release flags (API `GET /features`, any signed-in role). Mirrors be/src/shared/features. */
export type FeatureName =
  | "messaging"
  | "mobileParity"
  | "aiSettings"
  | "aiInsights"
  | "aiChat"
  | "redFlags"
  | "dataHandling"
  | "agentCalmUi"
  | "mobilePush";

export type FeatureFlags = Record<FeatureName, boolean>;

export async function getFeatures(): Promise<FeatureFlags> {
  const { data } = await apiClient.get<ApiResponse<{ flags: FeatureFlags }>>("/api/v1/features");
  return unwrap(data, "Failed to load the feature flags").flags;
}
