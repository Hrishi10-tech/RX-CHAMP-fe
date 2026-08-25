"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAppDispatch } from "@/store/hooks";
import { getChatUnread } from "@/features/chat/api/getChatUnread";
import { getContacts } from "@/features/chat/api/getContacts";
import { isConversationOnScreen } from "@/features/chat/lib/activeConversation";
import { acquireChatSocket, releaseChatSocket } from "@/features/chat/socket";
import { chatUnreadBumped, chatUnreadSynced } from "@/features/chat/store/chatSlice";
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
 * screen, and keeps the shell's unread badge current.
 *
 * Mounted in the dashboard shell, so it holds the chat socket open on every
 * screen. The messages page can't do either job: a page that isn't mounted hears
 * nothing, and a badge that only exists on the page it links to is pointless.
 */
export function useChatNotifier(enabled: boolean): void {
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const socket = acquireChatSocket();

    /**
     * Re-reads the server's total. Needed because the derived count only knows
     * about messages the socket delivered, and a socket that was down delivered
     * none of them.
     */
    const reconcile = () => {
      void getChatUnread()
        .then((count) => {
          if (active) dispatch(chatUnreadSynced(count));
        })
        .catch(() => {
          // Keep the derived count rather than zeroing a badge that may be right.
        });
    };

    const onMessage = (m: ChatMessage) => {
      if (!active) return;
      // `mine` covers this tab's own sends and the copy echoed to another tab.
      if (m.mine) return;
      // Reading it is what marks it read, so an open conversation adds nothing
      // to the badge — and announcing a message already on screen is noise.
      if (isConversationOnScreen(m.fromUserId)) return;

      dispatch(chatUnreadBumped());

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

    // A backgrounded tab misses nothing over the socket, but a suspended one
    // does — laptop lid, phone screen off, a browser throttling the connection.
    const onVisible = () => {
      if (document.visibilityState === "visible") reconcile();
    };

    socket.on("chat:message", onMessage);
    // `connect` covers the first one and every reconnect after it.
    socket.on("connect", reconcile);
    document.addEventListener("visibilitychange", onVisible);

    reconcile();

    return () => {
      active = false;
      // By reference: the messages page holds the same socket.
      socket.off("chat:message", onMessage);
      socket.off("connect", reconcile);
      document.removeEventListener("visibilitychange", onVisible);
      releaseChatSocket();
    };
  }, [enabled, router, dispatch]);
}
