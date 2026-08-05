import { apiClient } from "@/lib/api";
import type { ChatMessage, GetMessagesParams } from "@/features/chat/types";

export async function getMessages({
  withUserId,
  limit = 50,
}: GetMessagesParams): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    data?: ChatMessage[];
  }>("/api/v1/chat/messages", { params: { withUserId, limit } });

  return data.data ?? [];
}
