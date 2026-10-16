"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Clock,
  Clock3,
  Coffee,
  FileChartColumn,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { useSession } from "@/features/auth/hooks/useSession";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useChatNotifier } from "@/features/chat/hooks/useChatNotifier";
import { useApprovalsSummary } from "@/features/approvals/hooks/useApprovals";
import { useAppSelector } from "@/store/hooks";
import { ROLE_LABEL, canAccess, isApprover } from "@/constants/roles";
import { UserMenu } from "@/components/layout/UserMenu";
import PageWrapper from "@/components/layout/PageWrapper";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { MobileNav } from "@/components/layout/MobileNav";
import { NavLinks, type NavBadge } from "@/components/layout/NavLinks";
import type { NavSection } from "@/components/layout/types";
import { initialsOf } from "@/lib/text/initials";

const APPROVALS_HREF = "/dashboard/approvals";
const CHAT_HREF = "/dashboard/chat";

/**
 * Every destination, once. Each role sees the items `canAccess` allows, so the
 * menu and the route guard can never disagree.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Menu",
    items: [
      { href: "/dashboard/admin", label: "Admin Overview", icon: ShieldCheck },
      {
        href: "/dashboard/admin/team-management",
        label: "Team Management",
        icon: UserCog,
      },
      { href: "/dashboard/manager", label: "Team Overview", icon: Users },
      { href: "/dashboard/team-today", label: "Team today", icon: Activity },
      { href: "/dashboard/me", label: "My Dashboard", icon: LayoutDashboard },
      { href: CHAT_HREF, label: "Messages", icon: MessageSquare },
    ],
  },
  {
    heading: "Shifts and breaks",
    items: [
      { href: "/dashboard/shifts", label: "Shifts", icon: Clock3 },
      { href: "/dashboard/shifts/assign", label: "Assign shifts", icon: CalendarClock },
      { href: APPROVALS_HREF, label: "Approvals", icon: ClipboardCheck },
      { href: "/dashboard/breaks/team", label: "Team breaks", icon: Coffee },
    ],
  },
  {
    heading: "Reports",
    items: [{ href: "/dashboard/reports", label: "Reports", icon: FileChartColumn }],
  },
  {
    heading: "Manage",
    items: [
      {
        href: "/dashboard/admin/team-management/organization",
        label: "Companies",
        icon: Building2,
      },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(74_74_230)] to-[rgb(34_34_204)] text-white shadow-sm shadow-[rgba(34,34,204,0.35)]">
        <Clock className="h-5 w-5" aria-hidden />
      </span>
      {!collapsed && (
        <span className="text-lg font-bold tracking-tight text-slate-900">Rx Vision</span>
      )}
      {collapsed && <span className="sr-only">Rx Vision</span>}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const signedIn = ready && !!user;
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(signedIn);
  // Here rather than on the messages page: a popup about a new message is only
  // useful on the screens that are not already showing it, and so is the badge.
  useChatNotifier(signedIn);
  const chatUnread = useAppSelector((state) => state.chat.unreadTotal);
  const approver = isApprover(role);
  // GET /approvals/summary, polled every 60 s: the badge counts what is pending
  // and turns red once anything is overdue.
  const { data: approvalSummary } = useApprovalsSummary(signedIn && approver);
  const approvalsWaiting = Math.max(0, approvalSummary?.pending ?? 0);
  const approvalsOverdue = Math.max(0, approvalSummary?.overdue ?? 0);

  // Signed out here (Sign out, or another tab). Plain sign-in, no way back: the
  // next person to sign in on this tab starts at their own home. An expired
  // session mid-use goes through the API client, which remembers the page.
  useEffect(() => {
    if (ready && !user) router.replace("/auth/login");
  }, [ready, user, router]);

  // A link inside the drawer closes it via onNavigate; this also covers the
  // browser's back button and links elsewhere on the page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const closeNotifications = useCallback(() => setNotifOpen(false), []);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  const navSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccess(role, item.href)),
  })).filter((section) => section.items.length > 0);
  const matchHref = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const activeHref = navSections
    .flatMap((section) => section.items)
    .filter((item) => matchHref(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const badges: Record<string, NavBadge | undefined> = {
    [CHAT_HREF]: {
      count: chatUnread,
      label: `${chatUnread} unread ${chatUnread === 1 ? "message" : "messages"}`,
    },
    [APPROVALS_HREF]: approver
      ? {
          count: approvalsWaiting,
          tone: approvalsOverdue > 0 ? "alert" : "info",
          label:
            `${approvalsWaiting} ${approvalsWaiting === 1 ? "item" : "items"} waiting for approval` +
            (approvalsOverdue > 0 ? `, ${approvalsOverdue} overdue` : ""),
        }
      : undefined,
  };

  const displayName = user.name ?? user.email ?? "User";
  const initials = initialsOf(displayName);
  const roleText = role ? ROLE_LABEL[role] : "Unknown role";

  const userCard = (compact: boolean) => (
    <div
      className={`mt-3 flex items-center gap-2.5 rounded-2xl border border-slate-200 p-3 ${
        compact ? "justify-center" : ""
      }`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(74_74_230)] to-[rgb(34_34_204)] text-xs font-semibold text-white">
        {initials}
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
      </span>
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-slate-900">{displayName}</p>
          <p className="truncate text-[13px] text-slate-400">{roleText}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100 print:block print:min-h-0 print:bg-white">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 p-3 lg:block print:!hidden ${
          collapsed ? "w-24" : "w-72"
        }`}
      >
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div
            className={`flex items-center px-1 ${collapsed ? "justify-center" : "justify-between"}`}
          >
            <Brand collapsed={collapsed} />
            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          <nav aria-label="Main" className="mt-6 flex flex-1 flex-col gap-1.5 overflow-y-auto">
            <NavLinks
              sections={navSections}
              activeHref={activeHref}
              collapsed={collapsed}
              badges={badges}
            />
          </nav>

          <div className="relative">
            {userCard(collapsed)}
            {!collapsed && (
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 text-slate-400" />
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mt-2 flex items-center gap-2.5 rounded-xl py-2.5 text-[15px] font-medium text-slate-500 hover:bg-slate-100 ${
              collapsed ? "justify-center px-0" : "px-2.5"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500">
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </span>
            {!collapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>

      {/* overflow-x-clip: the page-enter slide must never widen the page on a phone. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip print:block">
        <header className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:justify-end print:hidden">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
            >
              <Menu className="h-5 w-5" />
              {approvalsWaiting + chatUnread > 0 && (
                <span
                  aria-hidden
                  className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-100 ${
                    chatUnread > 0 || approvalsOverdue > 0 ? "bg-red-500" : "bg-[rgb(34_34_204)]"
                  }`}
                />
              )}
            </button>
            <Brand />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
              }
              onClick={() => setNotifOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[rgb(34_34_204)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-slate-100"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <UserMenu />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-8 sm:px-6 print:p-0">
          <PageWrapper key={pathname}>{children}</PageWrapper>
        </main>
      </div>

      <MobileNav open={mobileOpen} onClose={closeMobile} brand={<Brand />} footer={userCard(false)}>
        <NavLinks
          sections={navSections}
          activeHref={activeHref}
          badges={badges}
          onNavigate={closeMobile}
        />
      </MobileNav>

      <NotificationPanel
        open={notifOpen}
        onClose={closeNotifications}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </div>
  );
}
