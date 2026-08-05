import { apiClient } from "@/lib/api";

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{
    success: boolean;
    data?: { unread: number };
  }>("/api/v1/notifications/unread-count");

  return data.data?.unread ?? 0;
}
