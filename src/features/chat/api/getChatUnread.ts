import { apiClient } from "@/lib/api";

/**
 * The authoritative unread total. The socket is a fast path, not the source of
 * truth: messages that arrive while it is down exist only in the database, so
 * the number is re-read on open, on every (re)connect, and when a backgrounded
 * tab comes back — the three moments where the derived count can have drifted.
 */
export async function getChatUnread(): Promise<number> {
  const { data } = await apiClient.get<{
    success: boolean;
    data?: { count?: number };
  }>("/api/v1/chat/unread");

  return data.data?.count ?? 0;
}
