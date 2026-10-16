"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";

import { attachSocketReauth } from "@/lib/socket/reauth";
import { getNotifications } from "@/features/notifications/api/getNotifications";
import { getUnreadCount } from "@/features/notifications/api/getUnreadCount";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api/markNotificationRead";
import { createNotificationsSocket } from "@/features/notifications/socket";
import { notificationHref } from "@/features/notifications/lib/links";
import { refreshForNotification } from "@/features/breaks/lib/notificationEffects";
import { refreshFor31Notification } from "@/features/approvals/lib/notificationEffects";
import type { NotificationView, UseNotificationsResult } from "@/features/notifications/types";

export function useNotifications(enabled: boolean): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  // The socket effect must not reconnect whenever the router or the client
  // object changes identity, so it reads them through refs.
  const routerRef = useRef(router);
  const queryClientRef = useRef(queryClient);
  useEffect(() => {
    routerRef.current = router;
    queryClientRef.current = queryClient;
  });

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

  const markReadRef = useRef(markRead);
  useEffect(() => {
    markReadRef.current = markRead;
  });

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

      // Break events change cached break data (the approvals badge, My breaks);
      // 3.1 events change approvals, Team today, focus time and the reports list.
      refreshForNotification(queryClientRef.current, n.type);
      refreshFor31Notification(queryClientRef.current, n.type);

      const href = notificationHref(n.type);
      toast(n.title, {
        description: n.body ?? undefined,
        action: href
          ? {
              label: "Open",
              onClick: () => {
                markReadRef.current(n.id);
                routerRef.current.push(href);
              },
            }
          : undefined,
      });
    });

    // Refresh-and-reconnect on `unauthorized`, capped with backoff. Retrying
    // unbounded here turned a handshake that could never authenticate into a
    // refresh loop running several times a second.
    attachSocketReauth(socket);

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
