"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Building2,
  FileText,
  TriangleAlert,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import type { NotificationFilter, NotificationPanelProps } from "./types";

const TYPE_STYLE: Record<string, { icon: LucideIcon; tint: string }> = {
  COMPANY_ASSIGNED: {
    icon: Building2,
    tint: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  USER_INVITED: {
    icon: UserPlus,
    tint: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  },
  TEAM_UPDATED: {
    icon: Users,
    tint: "bg-sky-50 text-sky-600 ring-sky-100",
  },
  REPORT_READY: {
    icon: FileText,
    tint: "bg-violet-50 text-violet-600 ring-violet-100",
  },
  SEAT_LIMIT: {
    icon: TriangleAlert,
    tint: "bg-amber-50 text-amber-600 ring-amber-100",
  },
};
const DEFAULT_STYLE = {
  icon: Bell,
  tint: "bg-slate-50 text-slate-600 ring-slate-100",
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  return `${day}d`;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<NotificationFilter>("all");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const groups = useMemo(() => {
    const list = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
    return (["Today", "Earlier"] as const)
      .map((g) => ({
        group: g,
        items: list.filter((n) => (g === "Today" ? isToday(n.createdAt) : !isToday(n.createdAt))),
      }))
      .filter((g) => g.items.length > 0);
  }, [filter, notifications]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="absolute bottom-4 right-4 top-4 flex w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
            initial={{ x: "110%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "110%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="border-b border-slate-100 px-6 pb-4 pt-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)] ring-1 ring-[rgba(34,34,204,0.12)]">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                      Notifications
                    </h2>
                    <p className="text-sm text-slate-400">You have {unreadCount} unread</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative mt-4 inline-flex rounded-full bg-slate-100 p-1">
                {(["all", "unread"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`relative rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                      filter === f ? "text-slate-900" : "text-slate-500"
                    }`}
                  >
                    {filter === f && (
                      <motion.span
                        layoutId="notif-filter-pill"
                        className="absolute inset-0 rounded-full bg-white shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      {f === "all" ? "All" : "Unread"}
                      {f === "unread" && unreadCount > 0 && (
                        <span
                          className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${
                            filter === "unread"
                              ? "bg-[rgb(34_34_204)] text-white"
                              : "bg-slate-300 text-slate-700"
                          }`}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {loading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                  <Bell className="h-8 w-8 animate-pulse" />
                  <p className="text-sm font-medium">Loading…</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                  <Bell className="h-8 w-8" />
                  <p className="text-sm font-medium">You&apos;re all caught up</p>
                </div>
              ) : (
                groups.map(({ group, items }) => (
                  <div key={group} className="mb-2">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                      <span className="text-xs font-bold tracking-tight text-slate-700">
                        {group}
                      </span>
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500">
                        {items.length}
                      </span>
                      <span className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="space-y-1">
                      {items.map((n) => {
                        const { icon: Icon, tint } = TYPE_STYLE[n.type] ?? DEFAULT_STYLE;
                        const unread = !n.read;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => unread && onMarkRead(n.id)}
                            className={`group relative flex w-full cursor-pointer items-start gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-50 ${
                              unread ? "bg-slate-50/70" : ""
                            }`}
                          >
                            {unread && (
                              <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[rgb(34_34_204)]" />
                            )}
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tint}`}
                            >
                              <Icon className="h-[18px] w-[18px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-snug text-slate-900">
                                {n.title}
                              </p>
                              <p className="mt-0.5 text-sm leading-snug text-slate-600">{n.body}</p>
                              <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                            </div>
                            {unread && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[rgb(34_34_204)]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="text-sm font-semibold text-[rgb(34_34_204)] hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
              >
                Mark all as read
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
