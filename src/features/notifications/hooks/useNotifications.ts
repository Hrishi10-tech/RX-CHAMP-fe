"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";

import { refreshAccessToken } from "@/lib/api";
import { getNotifications } from "@/features/notifications/api/getNotifications";
import { getUnreadCount } from "@/features/notifications/api/getUnreadCount";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api/markNotificationRead";
import { createNotificationsSocket } from "@/features/notifications/socket";
import type { NotificationView, UseNotificationsResult } from "@/features/notifications/types";

export function useNotifications(enabled: boolean): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([
        getNotifications({ page: 1, limit: 20 }),
        getUnreadCount(),
      ]);
      setNotifications(list.notifications);
      setUnreadCount(list.meta?.unread ?? unread);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    setLoading(true);
    refresh();

    const socket = createNotificationsSocket();
    socketRef.current = socket;

    socket.on("notification", (n: NotificationView) => {
      if (!active) return;
      setNotifications((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
      if (!n.read) setUnreadCount((c) => c + 1);
      toast(n.title, { description: n.body });
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
      if (active) refresh();
    });

    socket.connect();

    return () => {
      active = false;
      socket.off();
      socket.io.off("reconnect");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, refresh]);

  const markRead = useCallback((id: string) => {
    let wasUnread = false;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        if (!n.read) wasUnread = true;
        return { ...n, read: true, readAt: n.readAt ?? new Date().toISOString() };
      }),
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => {});
  }, []);

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh };
}
