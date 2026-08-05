import { apiClient } from "@/lib/api";

export async function captureScreenshot(userId: string): Promise<void> {
  await apiClient.post("/api/v1/screenshots/capture", { userId });
}
