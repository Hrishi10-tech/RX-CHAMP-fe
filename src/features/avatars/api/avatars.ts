import { apiClient, errorStatus, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import type { AvatarManifest, DayProgress, MyAvatar } from "@/features/avatars/types";

export const avatarKeys = {
  manifest: () => ["avatars", "manifest"] as const,
  mine: () => ["avatars", "mine"] as const,
  dayProgress: () => ["avatars", "day-progress"] as const,
};

export async function getAvatarManifest(): Promise<AvatarManifest> {
  const { data } = await apiClient.get<ApiResponse<AvatarManifest>>("/api/v1/avatars/manifest");
  return unwrap(data, "Failed to load the avatars");
}

export async function getMyAvatar(): Promise<MyAvatar> {
  const { data } = await apiClient.get<ApiResponse<MyAvatar>>("/api/v1/me/avatar");
  return unwrap(data, "Failed to load your avatar");
}

export async function setMyAvatar(avatarId: string): Promise<MyAvatar> {
  const { data } = await apiClient.put<ApiResponse<MyAvatar>>("/api/v1/me/avatar", { avatarId });
  return unwrap(data, "Failed to save your avatar");
}

export async function resetMyAvatar(): Promise<MyAvatar> {
  const { data } = await apiClient.delete<ApiResponse<MyAvatar>>("/api/v1/me/avatar");
  return unwrap(data, "Failed to reset your avatar");
}

/** A Super Admin puts someone back on the default for their gender. */
export async function resetUserAvatar(userId: string): Promise<void> {
  await apiClient.post(`/api/v1/users/${userId}/avatar/reset`);
}

/** The answer while the API has no such route (a 404): Working, nothing done yet. */
export const NO_DAY_PROGRESS: DayProgress = {
  status: "WORKING",
  date: "",
  workedSec: 0,
  targetSec: 8 * 3600,
  targetFromShift: false,
  overSec: 0,
  breakStartedAt: null,
  breakEndsAt: null,
  meetingStartedAt: null,
  meetingPromptAt: null,
  meetingFallbackAt: null,
};

export async function getDayProgress(): Promise<DayProgress> {
  try {
    const { data } = await apiClient.get<ApiResponse<DayProgress>>("/api/v1/me/day-progress");
    return unwrap(data, "Failed to load your day");
  } catch (err) {
    if (errorStatus(err) === 404) return NO_DAY_PROGRESS;
    throw err;
  }
}
