"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  Award,
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  Fingerprint,
  Home,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  FileText,
  Hourglass,
  ListChecks,
  MessageSquareText,
  Moon,
  SkipForward,
  SlidersHorizontal,
  TriangleAlert,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { notificationHref } from "@/features/notifications/lib/links";
import { useDialogFocus } from "@/lib/hooks/useDialogFocus";
import { dateKeyOf, todayKey } from "@/lib/time/businessTime";
import type { NotificationFilter, NotificationPanelProps } from "./types";

const TYPE_STYLE: Record<string, { icon: LucideIcon; tint: string }> = {
  COMPANY_ASSIGNED: {
    icon: Building2,
    tint: "bg-working-wash text-working ring-working-wash-strong",
  },
  USER_INVITED: {
    icon: UserPlus,
    tint: "bg-brand-wash text-brand ring-brand-wash-strong",
  },
  TEAM_UPDATED: {
    icon: Users,
    tint: "bg-brand-wash text-brand ring-brand-wash-strong",
  },
  REPORT_READY: {
    icon: FileText,
    tint: "bg-meeting-wash text-meeting ring-meeting-wash-strong",
  },
  SEAT_LIMIT: {
    icon: TriangleAlert,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  BREAK_APPROVAL_REQUESTED: {
    icon: Coffee,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  BREAK_APPROVALS_DIGEST: {
    icon: ListChecks,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  BREAK_DECIDED: {
    icon: ClipboardCheck,
    tint: "bg-working-wash text-working ring-working-wash-strong",
  },
  SKIP_REQUESTED: {
    icon: SkipForward,
    tint: "bg-meeting-wash text-meeting ring-meeting-wash-strong",
  },
  AUTO_SKIP_REQUESTED: {
    icon: SkipForward,
    tint: "bg-fill text-soft ring-panel",
  },
  SKIP_COMMENT_ADDED: {
    icon: MessageSquareText,
    tint: "bg-meeting-wash text-meeting ring-meeting-wash-strong",
  },
  MEETING_REQUESTED: { icon: Users, tint: "bg-brand-wash text-brand ring-brand-wash-strong" },
  MEETING_DECIDED: {
    icon: ClipboardCheck,
    tint: "bg-working-wash text-working ring-working-wash-strong",
  },
  APPROVALS_DUE_SOON: {
    icon: Hourglass,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  APPROVALS_OVERDUE: {
    icon: AlarmClock,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  APPROVALS_ESCALATED: {
    icon: TriangleAlert,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  MONTHLY_REPORT_READY: {
    icon: FileText,
    tint: "bg-meeting-wash text-meeting ring-meeting-wash-strong",
  },
  DAY_AUTO_CLOSED: { icon: Moon, tint: "bg-fill text-soft ring-panel" },
  FOCUS_ADJUSTED: {
    icon: SlidersHorizontal,
    tint: "bg-brand-wash text-brand ring-brand-wash-strong",
  },
  // 3.4: leave.
  LEAVE_REQUESTED: { icon: CalendarDays, tint: "bg-brand-wash text-brand ring-brand-wash-strong" },
  LEAVE_DECIDED: {
    icon: CalendarCheck,
    tint: "bg-working-wash text-working ring-working-wash-strong",
  },
  LEAVE_CANCELLED: { icon: CalendarX, tint: "bg-fill text-soft ring-panel" },
  LEAVE_REVOKED: {
    icon: CalendarX,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  LEAVE_ADJUSTED: {
    icon: SlidersHorizontal,
    tint: "bg-meeting-wash text-meeting ring-meeting-wash-strong",
  },
  LEAVE_UPDATED: {
    icon: CalendarDays,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  // 3.5: work from home, comp off, biometric.
  WFH_REQUESTED: { icon: Home, tint: "bg-brand-wash text-brand ring-brand-wash-strong" },
  WFH_DECIDED: { icon: Home, tint: "bg-working-wash text-working ring-working-wash-strong" },
  WFH_CANCELLED: { icon: Home, tint: "bg-fill text-soft ring-panel" },
  WFH_REVOKED: { icon: Home, tint: "bg-attention-wash text-attention ring-attention-wash-strong" },
  WFH_SCHEDULED: { icon: Home, tint: "bg-brand-wash text-brand ring-brand-wash-strong" },
  WFH_AUTO_ENDED: { icon: Moon, tint: "bg-fill text-soft ring-panel" },
  COMPOFF_CLAIMED: { icon: Award, tint: "bg-brand-wash text-brand ring-brand-wash-strong" },
  COMPOFF_DECIDED: { icon: Award, tint: "bg-working-wash text-working ring-working-wash-strong" },
  COMPOFF_CREDITED: { icon: Award, tint: "bg-working-wash text-working ring-working-wash-strong" },
  COMPOFF_EXPIRING: {
    icon: Award,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
  BIOMETRIC_NO_CHECKOUT: {
    icon: Fingerprint,
    tint: "bg-attention-wash text-attention ring-attention-wash-strong",
  },
};
const DEFAULT_STYLE = {
  icon: Bell,
  tint: "bg-fill text-soft ring-panel",
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

/** 3.6 (W-03): "today" in the business zone, as everywhere else. */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && dateKeyOf(d) === todayKey();
}

export function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  role = null,
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  // A real modal: focus moves in, Tab stays inside, and the bell gets it back.
  useDialogFocus(open, panelRef);

  function openItem(id: string, type: string, unread: boolean) {
    if (unread) onMarkRead(id);
    const href = notificationHref(type, role);
    if (!href) return;
    onClose();
    router.push(href);
  }

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
      {/*
        `pointer-events-none` on the wrapper below, re-enabled on the two children
        that need it. The wrapper covers the whole viewport, so if it ever outlives
        its exit animation it swallows every click on the page, this panel froze
        Messages and Team Overview exactly that way. Clicks now pass through a
        lingering layer instead of vanishing into it: the worst case becomes a faint
        backdrop you can click through, rather than a dead page.
      */}
      {open && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <motion.div
            className="pointer-events-auto absolute inset-0 bg-scrim/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="pointer-events-auto absolute bottom-4 right-4 top-4 flex w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-3xl bg-card shadow-2xl outline-none ring-1 ring-scrim/5"
            initial={{ x: "110%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "110%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="border-b border-divider px-6 pb-4 pt-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/8 text-brand ring-1 ring-brand/12">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 id={titleId} className="text-lg font-bold tracking-tight text-primary">
                      Notifications
                    </h2>
                    <p className="text-sm text-quiet">You have {unreadCount} unread</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-quiet hover:bg-panel hover:text-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/*
                One pill that slides, rather than a `layoutId` pair that is torn out
                of one button and rebuilt in the other. That shared-layout transition
                sat inside this panel's AnimatePresence, and clicking a filter while
                the panel was still animating left the exit unfinished, so the panel
                never unmounted and its full-screen wrapper kept eating clicks. This
                pill simply exists and moves, which cannot interact with the exit.
                Equal-width columns so it lands squarely on either tab.
              */}
              <div className="relative mt-4 grid w-fit grid-cols-2 rounded-full bg-panel p-1">
                <motion.span
                  aria-hidden
                  className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-card shadow-sm"
                  animate={{ x: filter === "all" ? "0%" : "100%" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
                {(["all", "unread"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                      filter === f ? "text-primary" : "text-quiet"
                    }`}
                  >
                    <span className="relative flex items-center justify-center gap-1.5">
                      {f === "all" ? "All" : "Unread"}
                      {f === "unread" && unreadCount > 0 && (
                        <span
                          className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-bold leading-none ${
                            filter === "unread"
                              ? "bg-brand text-on-brand"
                              : "bg-edge-strong text-body"
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
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-quiet">
                  <Bell className="h-8 w-8 animate-pulse" />
                  <p className="text-sm font-medium">Loading…</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-quiet">
                  <Bell className="h-8 w-8" />
                  <p className="text-sm font-medium">You&apos;re all caught up</p>
                </div>
              ) : (
                groups.map(({ group, items }) => (
                  <div key={group} className="mb-2">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                      <span className="text-xs font-bold tracking-tight text-body">{group}</span>
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-panel px-1.5 text-[0.6875rem] font-semibold text-quiet">
                        {items.length}
                      </span>
                      <span className="h-px flex-1 bg-panel" />
                    </div>
                    <div className="space-y-1">
                      {items.map((n) => {
                        const { icon: Icon, tint } = TYPE_STYLE[n.type] ?? DEFAULT_STYLE;
                        const unread = !n.read;
                        const linked = notificationHref(n.type, role) !== null;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => openItem(n.id, n.type, unread)}
                            className={`group relative flex w-full cursor-pointer items-start gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left transition-colors hover:bg-fill ${
                              unread ? "bg-fill/70" : ""
                            }`}
                          >
                            {unread && (
                              <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand" />
                            )}
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tint}`}
                            >
                              <Icon className="h-[18px] w-[18px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-snug text-primary">
                                {n.title}
                              </p>
                              {n.body && (
                                <p className="mt-0.5 text-sm leading-snug text-soft">{n.body}</p>
                              )}
                              <p className="mt-1 text-xs text-quiet">{timeAgo(n.createdAt)}</p>
                            </div>
                            {unread && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                            )}
                            {linked && (
                              <ChevronRight
                                aria-hidden
                                className="mt-1 h-4 w-4 shrink-0 text-faint group-hover:text-quiet"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-divider px-5 py-3">
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="text-sm font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:text-faint disabled:no-underline"
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
