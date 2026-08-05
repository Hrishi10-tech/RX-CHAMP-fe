import { apiClient } from "@/lib/api";
import type { ChatMessage, SendMessageParams } from "@/features/chat/types";

export async function sendMessage({ toUserId, body }: SendMessageParams): Promise<ChatMessage> {
  const { data } = await apiClient.post<{
    success: boolean;
    data: ChatMessage;
  }>("/api/v1/chat/messages", { toUserId, body });

  return data.data;
}
