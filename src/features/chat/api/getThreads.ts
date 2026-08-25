import { apiClient } from "@/lib/api";
import type { ChatThread } from "@/features/chat/types";

/**
 * The conversation list, carrying each thread's last message and unread count.
 * Preferred over the plain contact list: without the server's counts the list
 * opens with no previews and no badges, and only fills in for the people who
 * happen to message while the page is open.
 */
export async function getThreads(): Promise<ChatThread[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    data?: ChatThread[];
  }>("/api/v1/chat/threads");

  return data.data ?? [];
}
