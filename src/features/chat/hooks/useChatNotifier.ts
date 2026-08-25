"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getContacts } from "@/features/chat/api/getContacts";
import { isConversationOnScreen } from "@/features/chat/lib/activeConversation";
import { acquireChatSocket, releaseChatSocket } from "@/features/chat/socket";
import type { ChatMessage } from "@/features/chat/types";

/** Longest a message body runs in a popup before it is cut short. */
const PREVIEW_LIMIT = 120;

let namesPromise: Promise<Map<string, string>> | null = null;

/**
 * Sender names, resolved once and only when a message actually arrives — a
 * message carries `fromUserId` and nothing else, and most sessions never get one,
 * so fetching the directory up front would usually be wasted.
 *
 * A sender who joined after this resolved falls back to a generic title rather
 * than re-fetching, which would hand every message from a stranger a request.
 */
function senderNames(): Promise<Map<string, string>> {
  namesPromise ??= getContacts()
    .then((list) => new Map(list.map((c) => [c.userId, c.name])))
    .catch(() => new Map<string, string>());
  return namesPromise;
}

function preview(body: string): string {
  const text = body.trim();
  return text.length > PREVIEW_LIMIT ? `${text.slice(0, PREVIEW_LIMIT - 1)}…` : text;
}

/**
 * Raises a popup for a message that arrives while its conversation isn't on
 * screen. Mounted in the dashboard shell, so it holds the chat socket open on
 * every screen — the messages page can't do this, because a page that isn't
 * mounted hears nothing.
 */
export function useChatNotifier(enabled: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const socket = acquireChatSocket();

    const onMessage = (m: ChatMessage) => {
      if (!active) return;
      // `mine` covers this tab's own sends and the copy echoed to another tab.
      if (m.mine) return;
      // Announcing a message the reader is already looking at is noise.
      if (isConversationOnScreen(m.fromUserId)) return;

      void senderNames().then((names) => {
        if (!active) return;
        toast(names.get(m.fromUserId) ?? "New message", {
          description: preview(m.body),
          action: {
            label: "Open",
            onClick: () => router.push("/dashboard/chat"),
          },
        });
      });
    };

    socket.on("chat:message", onMessage);

    return () => {
      active = false;
      // By reference: the messages page holds the same socket.
      socket.off("chat:message", onMessage);
      releaseChatSocket();
    };
  }, [enabled, router]);
}
