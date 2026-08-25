"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";

import { useAppDispatch } from "@/store/hooks";
import { getThreads } from "@/features/chat/api/getThreads";
import { getMessages } from "@/features/chat/api/getMessages";
import { sendMessage } from "@/features/chat/api/sendMessage";
import { acquireChatSocket, releaseChatSocket } from "@/features/chat/socket";
import { setActiveConversation } from "@/features/chat/lib/activeConversation";
import { chatThreadRead } from "@/features/chat/store/chatSlice";
import type {
  ChatContact,
  ChatContactView,
  ChatMessage,
  UseChatOptions,
  UseChatResult,
} from "@/features/chat/types";

/** The server rejects anything longer, so say so here instead of losing the text. */
const MAX_BODY_LENGTH = 2000;

/** Floor between two forced refetches of the same thread. */
const REFETCH_COOLDOWN_MS = 5_000;

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

  const dispatch = useAppDispatch();

  const activeUserIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  // Threads already fetched once. The socket streams every later message, so
  // reopening a conversation reads the cache instead of refetching the page.
  const loadedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());
  const lastFetchRef = useRef<Map<string, number>>(new Map());
  const unreadRef = useRef<Record<string, number>>({});
  unreadRef.current = unread;
  /** Thread that has been read on screen but not yet acknowledged to the server. */
  const unacknowledgedRef = useRef<string | null>(null);

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
    // A flapping socket fires `reconnect` over and over; without this every flap
    // would refetch the open thread.
    if (force) {
      const last = lastFetchRef.current.get(userId) ?? 0;
      if (Date.now() - last < REFETCH_COOLDOWN_MS) return;
    }

    inFlightRef.current.add(userId);
    // A forced refetch is a silent catch-up over messages already on screen —
    // showing the spinner would blank the thread and read as a blink.
    const silent = force || cached;
    if (!silent && activeUserIdRef.current === userId) setLoadingMessages(true);
    try {
      const thread = await getMessages({ withUserId: userId, limit: 50 });
      loadedRef.current.add(userId);
      lastFetchRef.current.set(userId, Date.now());
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

  /**
   * Tells the server the open thread has been read. Re-reading it is what does
   * that — there is no endpoint for the acknowledgement alone — so it waits until
   * the reader leaves, or hides the tab. One call per visit, rather than one per
   * message for as long as a conversation stays live.
   *
   * The response is discarded: the socket already delivered these messages, and
   * the call is made for its effect on the server, not its body.
   */
  const acknowledgeRead = useCallback(() => {
    const userId = unacknowledgedRef.current;
    if (!userId) return;
    unacknowledgedRef.current = null;
    void getMessages({ withUserId: userId, limit: 50 }).catch(() => {
      // Missing it leaves the thread unread server-side, which the next open
      // corrects. Retrying here would spend a request on a dead connection.
    });
  }, []);

  const selectContact = useCallback(
    (userId: string) => {
      if (activeUserIdRef.current === userId) return;
      // Leaving the previous thread is the moment to settle up for it.
      acknowledgeRead();
      activeUserIdRef.current = userId;
      setActiveConversation(userId);
      setActiveUserId(userId);
      const wasUnread = unreadRef.current[userId] ?? 0;
      if (wasUnread > 0) dispatch(chatThreadRead(wasUnread));
      setUnread((prev) => (prev[userId] ? { ...prev, [userId]: 0 } : prev));
      setLoadingMessages(!loadedRef.current.has(userId));
      void loadMessages(userId);
    },
    [loadMessages, dispatch, acknowledgeRead],
  );

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    setLoadingContacts(true);
    getThreads()
      .then((list) => {
        if (!active) return;
        setContacts(list);

        const seededPreview: Record<string, { body: string; at: string }> = {};
        const seededUnread: Record<string, number> = {};
        for (const t of list) {
          if (t.lastMessage) {
            seededPreview[t.userId] = { body: t.lastMessage.body, at: t.lastMessage.createdAt };
          }
          if (t.unreadCount) seededUnread[t.userId] = t.unreadCount;
        }
        // Server values first, so anything the socket delivered while this was in
        // flight stays on top of them rather than being rolled back.
        setPreview((prev) => ({ ...seededPreview, ...prev }));
        setUnread((prev) => ({ ...seededUnread, ...prev }));

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

    const socket = acquireChatSocket();
    socketRef.current = socket;

    const onMessage = (m: ChatMessage) => {
      if (!active) return;
      const other = otherParty(m);
      bumpPreview(other, m);
      appendToThread(other, m);

      if (other !== activeUserIdRef.current) {
        if (!m.mine) setUnread((prev) => ({ ...prev, [other]: (prev[other] ?? 0) + 1 }));
      } else if (!m.mine) {
        // Read the moment it lands, but the server does not know that yet.
        unacknowledgedRef.current = other;
      }
    };

    const onReconnect = () => {
      if (!active) return;
      const open = activeUserIdRef.current;
      // Messages sent while the socket was down never arrived, so the closed
      // threads are stale — drop them and they refetch when next opened. The
      // open one keeps its flag so the catch-up below stays silent.
      loadedRef.current = new Set(open && loadedRef.current.has(open) ? [open] : []);
      if (open) void loadMessages(open, true);
    };

    // Both by reference: the socket is shared with the notifier, and a bare
    // `off()` would take its listener down too. Reauth is attached where the
    // socket is created, once, rather than per holder.
    // Hiding the tab is leaving the conversation as far as the server is
    // concerned, and it may not be foregrounded again before it is closed.
    const onHidden = () => {
      if (document.visibilityState === "hidden") acknowledgeRead();
    };

    socket.on("chat:message", onMessage);
    socket.io.on("reconnect", onReconnect);
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      active = false;
      socket.off("chat:message", onMessage);
      socket.io.off("reconnect", onReconnect);
      document.removeEventListener("visibilitychange", onHidden);
      acknowledgeRead();
      socketRef.current = null;
      // Leaving the page closes the conversation, so a later message about it is
      // news again and the notifier should say so.
      setActiveConversation(null);
      releaseChatSocket();
    };
  }, [
    enabled,
    autoSelectRole,
    bumpPreview,
    appendToThread,
    loadMessages,
    selectContact,
    acknowledgeRead,
  ]);

  const send = useCallback(
    async (body: string) => {
      const to = activeUserIdRef.current;
      const trimmed = body.trim();
      if (!to || !trimmed) return;
      if (trimmed.length > MAX_BODY_LENGTH) {
        toast.error(`Message is too long. Keep it under ${MAX_BODY_LENGTH} characters.`);
        return;
      }
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
