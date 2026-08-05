"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";

import { apiClient } from "@/lib/api";
import { getContacts } from "@/features/chat/api/getContacts";
import { getMessages } from "@/features/chat/api/getMessages";
import { sendMessage } from "@/features/chat/api/sendMessage";
import { createChatSocket } from "@/features/chat/socket";
import type {
  ChatContact,
  ChatContactView,
  ChatMessage,
  UseChatOptions,
  UseChatResult,
} from "@/features/chat/types";

function otherParty(m: ChatMessage): string {
  return m.mine ? m.toUserId : m.fromUserId;
}

export function useChat({ enabled, autoSelectRole }: UseChatOptions): UseChatResult {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<Record<string, { body: string; at: string }>>({});
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const activeUserIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const bumpPreview = useCallback((userId: string, m: ChatMessage) => {
    setPreview((prev) => {
      const existing = prev[userId];
      if (existing && existing.at >= m.createdAt) return prev;
      return { ...prev, [userId]: { body: m.body, at: m.createdAt } };
    });
  }, []);

  const loadMessages = useCallback(async (userId: string) => {
    setLoadingMessages(true);
    try {
      const thread = await getMessages({ withUserId: userId, limit: 50 });
      if (activeUserIdRef.current !== userId) return;
      setMessages(thread);
      const last = thread[thread.length - 1];
      if (last)
        setPreview((prev) => ({
          ...prev,
          [userId]: { body: last.body, at: last.createdAt },
        }));
    } catch {
      if (activeUserIdRef.current === userId) setMessages([]);
    } finally {
      if (activeUserIdRef.current === userId) setLoadingMessages(false);
    }
  }, []);

  const selectContact = useCallback(
    (userId: string) => {
      if (activeUserIdRef.current === userId) return;
      activeUserIdRef.current = userId;
      setActiveUserId(userId);
      setMessages([]);
      setUnread((prev) => (prev[userId] ? { ...prev, [userId]: 0 } : prev));
      void loadMessages(userId);
    },
    [loadMessages],
  );

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    setLoadingContacts(true);
    getContacts()
      .then((list) => {
        if (!active) return;
        setContacts(list);
        if (autoSelectRole && !activeUserIdRef.current) {
          const match = list.find((c) => c.role.toUpperCase() === autoSelectRole.toUpperCase());
          if (match) selectContact(match.userId);
        }
      })
      .catch(() => {
        if (active) setContacts([]);
      })
      .finally(() => {
        if (active) setLoadingContacts(false);
      });

    const socket = createChatSocket();
    socketRef.current = socket;

    socket.on("chat:message", (m: ChatMessage) => {
      if (!active) return;
      const other = otherParty(m);
      bumpPreview(other, m);

      if (other === activeUserIdRef.current) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      } else if (!m.mine) {
        setUnread((prev) => ({ ...prev, [other]: (prev[other] ?? 0) + 1 }));
      }
    });

    socket.on("unauthorized", async () => {
      try {
        await apiClient.post("/api/v1/auth/refresh");
        if (active) socket.connect();
      } catch {}
    });

    socket.io.on("reconnect", () => {
      if (!active) return;
      const open = activeUserIdRef.current;
      if (open) void loadMessages(open);
    });

    socket.connect();

    return () => {
      active = false;
      socket.off();
      socket.io.off("reconnect");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, autoSelectRole, bumpPreview, loadMessages, selectContact]);

  const send = useCallback(async (body: string) => {
    const to = activeUserIdRef.current;
    const trimmed = body.trim();
    if (!to || !trimmed) return;
    setSending(true);
    try {
      const msg = await sendMessage({ toUserId: to, body: trimmed });
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
      bumpPreview(to, msg);
    } catch {
      toast.error("Couldn't send message. Try again.");
    } finally {
      setSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contactViews = useMemo<ChatContactView[]>(() => {
    const views = contacts.map((c) => ({
      ...c,
      unread: unread[c.userId] ?? 0,
      lastMessage: preview[c.userId]?.body,
      lastAt: preview[c.userId]?.at,
    }));
    return views.sort((a, b) => {
      if (a.lastAt && b.lastAt) return a.lastAt < b.lastAt ? 1 : -1;
      if (a.lastAt) return -1;
      if (b.lastAt) return 1;
      return 0;
    });
  }, [contacts, unread, preview]);

  const activeContact = useMemo(
    () => contactViews.find((c) => c.userId === activeUserId) ?? null,
    [contactViews, activeUserId],
  );

  const totalUnread = useMemo(() => Object.values(unread).reduce((sum, n) => sum + n, 0), [unread]);

  return {
    contacts: contactViews,
    activeUserId,
    activeContact,
    messages,
    loadingContacts,
    loadingMessages,
    sending,
    totalUnread,
    selectContact,
    send,
  };
}
