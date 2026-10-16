import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import type { AppSettingsPatch, AppSettingsView } from "@/features/settings/types";

/**
 *   GET   /settings   (any role)        -> AppSettingsView
 *   PATCH /settings   (Super Admin)     -> AppSettingsView
 * Out-of-range values: 400 VALIDATION_ERROR with the field in `details.field`.
 */
export async function getSettings(): Promise<AppSettingsView> {
  const { data } = await apiClient.get<ApiResponse<AppSettingsView>>("/api/v1/settings");
  return unwrap(data, "Failed to load the settings");
}

export async function updateSettings(patch: AppSettingsPatch): Promise<AppSettingsView> {
  const { data } = await apiClient.patch<ApiResponse<AppSettingsView>>("/api/v1/settings", patch);
  return unwrap(data, "Failed to save the settings");
}
