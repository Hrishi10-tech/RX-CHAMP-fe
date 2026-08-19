"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";

import { refreshAccessToken } from "@/lib/api";
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

// A fetch can land after the socket already pushed newer messages into the
// cached thread; keep those instead of letting the older page overwrite them.
function mergeThread(cached: ChatMessage[] | undefined, fetched: ChatMessage[]): ChatMessage[] {
  if (!cached?.length) return fetched;
  const fetchedIds = new Set(fetched.map((m) => m.id));
  const live = cached.filter((m) => !fetchedIds.has(m.id));
  return live.length ? [...fetched, ...live] : fetched;
}

export function useChat({ enabled, autoSelectRole }: UseChatOptions): UseChatResult {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<Record<string, { body: string; at: string }>>({});
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const activeUserIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  // Threads already fetched once. The socket streams every later message, so
  // reopening a conversation reads the cache instead of refetching the page.
  const loadedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());

  const messages = useMemo<ChatMessage[]>(
    () => (activeUserId ? threads[activeUserId] ?? [] : []),
    [threads, activeUserId],
  );

  const bumpPreview = useCallback((userId: string, m: ChatMessage) => {
    setPreview((prev) => {
      const existing = prev[userId];
      if (existing && existing.at >= m.createdAt) return prev;
      return { ...prev, [userId]: { body: m.body, at: m.createdAt } };
    });
  }, []);

  const appendToThread = useCallback((userId: string, m: ChatMessage) => {
    setThreads((prev) => {
      const thread = prev[userId];
      // Never seed a thread from a single live message: a partial history would
      // look loaded and suppress the real fetch when the chat is opened.
      if (!thread) return prev;
      if (thread.some((x) => x.id === m.id)) return prev;
      return { ...prev, [userId]: [...thread, m] };
    });
  }, []);

  const loadMessages = useCallback(async (userId: string, force = false) => {
    if (inFlightRef.current.has(userId)) return;
    const cached = loadedRef.current.has(userId);
    if (cached && !force) return;

    inFlightRef.current.add(userId);
    if (!cached && activeUserIdRef.current === userId) setLoadingMessages(true);
    try {
      const thread = await getMessages({ withUserId: userId, limit: 50 });
      loadedRef.current.add(userId);
      setThreads((prev) => ({ ...prev, [userId]: mergeThread(prev[userId], thread) }));
      const last = thread[thread.length - 1];
      if (last)
        setPreview((prev) => ({
          ...prev,
          [userId]: { body: last.body, at: last.createdAt },
        }));
    } catch {
      // Leave it out of loadedRef so reopening the chat retries the fetch.
      if (!cached) setThreads((prev) => (prev[userId] ? prev : { ...prev, [userId]: [] }));
    } finally {
      inFlightRef.current.delete(userId);
      if (activeUserIdRef.current === userId) setLoadingMessages(false);
    }
  }, []);

  const selectContact = useCallback(
    (userId: string) => {
      if (activeUserIdRef.current === userId) return;
      activeUserIdRef.current = userId;
      setActiveUserId(userId);
      setUnread((prev) => (prev[userId] ? { ...prev, [userId]: 0 } : prev));
      setLoadingMessages(!loadedRef.current.has(userId));
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
      appendToThread(other, m);

      if (other !== activeUserIdRef.current && !m.mine) {
        setUnread((prev) => ({ ...prev, [other]: (prev[other] ?? 0) + 1 }));
      }
    });

    socket.on("unauthorized", async () => {
      try {
        // Shared single-flight refresh: when the access token expires every
        // socket and request gets kicked at once, and N parallel refreshes
        // rotate the token N times server-side — only the last one survives.
        await refreshAccessToken();
        if (active) socket.connect();
      } catch {
        // Refresh failed, so the session is genuinely gone. The API client owns
        // redirecting to login; reconnecting here would just get kicked again.
      }
    });

    socket.io.on("reconnect", () => {
      if (!active) return;
      // Messages sent while the socket was down never arrived, so every cached
      // thread is stale. Refetch the open one now, the rest when they're opened.
      loadedRef.current.clear();
      const open = activeUserIdRef.current;
      if (open) void loadMessages(open, true);
    });

    socket.connect();

    return () => {
      active = false;
      socket.off();
      socket.io.off("reconnect");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, autoSelectRole, bumpPreview, appendToThread, loadMessages, selectContact]);

  const send = useCallback(
    async (body: string) => {
      const to = activeUserIdRef.current;
      const trimmed = body.trim();
      if (!to || !trimmed) return;
      setSending(true);
      try {
        const msg = await sendMessage({ toUserId: to, body: trimmed });
        appendToThread(to, msg);
        bumpPreview(to, msg);
      } catch {
        toast.error("Couldn't send message. Try again.");
      } finally {
        setSending(false);
      }
    },
    [appendToThread, bumpPreview],
  );

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
