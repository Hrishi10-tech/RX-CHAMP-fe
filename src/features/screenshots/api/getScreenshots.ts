import { apiClient, type ApiResponse } from "@/lib/api";
import type { GetScreenshotsParams, ScreenshotList } from "@/features/screenshots/types";

export async function getScreenshots({
  userId,
  limit,
  offset,
  from,
  to,
  kind,
  q,
  includeArchived,
}: GetScreenshotsParams): Promise<ScreenshotList> {
  const params = Object.fromEntries(
    Object.entries({
      userId,
      limit,
      offset,
      from,
      to,
      kind,
      q,
      includeArchived,
    }).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );

  const { data } = await apiClient.get<ApiResponse<ScreenshotList>>("/api/v1/screenshots", {
    params,
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load screenshots");
  }

  return data.data;
}
