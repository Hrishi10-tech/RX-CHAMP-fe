import { apiClient } from "@/lib/api";
import type { ChatContact } from "@/features/chat/types";

export async function getContacts(): Promise<ChatContact[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    data?: ChatContact[];
  }>("/api/v1/chat/contacts");

  return data.data ?? [];
}
