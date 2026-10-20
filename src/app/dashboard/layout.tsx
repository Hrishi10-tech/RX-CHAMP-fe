"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronsLeft, ChevronsRight, Clock, Menu } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/features/auth/hooks/useSession";
import { useMeSync } from "@/features/auth/hooks/useMe";
import { portalRefused } from "@/features/auth/api/getMe";
import { logout as logoutRequest } from "@/features/auth/api/logout";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useChatNotifier } from "@/features/chat/hooks/useChatNotifier";
import { useApprovalsSummary } from "@/features/approvals/hooks/useApprovals";
import { OrgSwitcher } from "@/features/organisations/components/OrgSwitcher";
import { PickOrganisation } from "@/features/organisations/components/PickOrganisation";
import { useAppSelector } from "@/store/hooks";
import {
  ROLE_LABEL,
  STAFF_REFUSED_ROUTE,
  canAccess,
  isApprover,
  isOrgFreeRoute,
  resolveHomeRoute,
} from "@/constants/roles";
import { UserMenu } from "@/components/layout/UserMenu";
import PageWrapper from "@/components/layout/PageWrapper";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { MobileNav } from "@/components/layout/MobileNav";
import { NavLinks, type NavBadge } from "@/components/layout/NavLinks";
import { APPROVALS_HREF, CHAT_HREF, activeHrefFor, navFor } from "@/components/layout/nav";
import { ErrorState } from "@/components/ui/StatePanel";
import { clearSession } from "@/lib/auth/session";
import { errorMessage } from "@/lib/api";
import { initialsOf } from "@/lib/text/initials";
import { onOrgGone, useSelectedOrg } from "@/lib/org/selection";

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

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-sm text-slate-500">
      {children}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, ready, me, grants } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const org = useSelectedOrg();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const signedIn = ready && !!user;
  // The role, organisation and grants come from GET /me, never from the cookie.
  const meQuery = useMeSync(signedIn);
  const refused = portalRefused(me);
  const verified = Boolean(me) && !refused;
  const live = signedIn && verified;
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(live);
  // Here rather than on the messages page: a popup about a new message is only
  // useful on the screens that are not already showing it, and so is the badge.
  useChatNotifier(live);
  const chatUnread = useAppSelector((state) => state.chat.unreadTotal);
  const approver = isApprover(role);
  const isSuperAdmin = role === "SUPER_ADMIN";
  const needsOrg = isSuperAdmin && !org && !isOrgFreeRoute(pathname);
  // GET /approvals/summary, polled every 60 s: the badge counts what is pending
  // and turns red once anything is overdue. A Super Admin has none without an org.
  const { data: approvalSummary } = useApprovalsSummary(
    live && approver && (!isSuperAdmin || Boolean(org)),
  );
  const approvalsWaiting = Math.max(0, approvalSummary?.pending ?? 0);
  const approvalsOverdue = Math.max(0, approvalSummary?.overdue ?? 0);

  // Signed out here (Sign out, or another tab). Plain sign-in, no way back: the
  // next person to sign in on this tab starts at their own home. An expired
  // session mid-use goes through the API client, which remembers the page.
  useEffect(() => {
    if (ready && !user) router.replace("/auth/login");
  }, [ready, user, router]);

  // Staff never use the portal (SPEC 1.1): end the session and say why.
  useEffect(() => {
    if (!refused) return;
    void logoutRequest();
    clearSession();
    window.location.replace(STAFF_REFUSED_ROUTE);
  }, [refused]);

  // A page this person may not open (a manager whose grants were just removed,
  // say): back to their home rather than a page full of errors.
  const allowed = !verified || canAccess(role, pathname, { grants: me?.grants });
  useEffect(() => {
    if (verified && !allowed) router.replace(resolveHomeRoute(role));
  }, [verified, allowed, role, router]);

  // The Super Admin's organisation was deleted (or this browser kept a stale one):
  // the API client has dropped it at the first 404 ORG_NOT_FOUND. Say so once and
  // fall back to the platform view rather than leaving a page of errors.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  useEffect(
    () =>
      onOrgGone((gone) => {
        toast.info(`${gone.name || "That organisation"} no longer exists`, {
          id: "org-gone",
          description: "Showing all organisations.",
        });
        if (!isOrgFreeRoute(pathRef.current)) router.replace("/dashboard/overview");
      }),
    [router],
  );

  // A link inside the drawer closes it via onNavigate; this also covers the
  // browser's back button and links elsewhere on the page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const closeNotifications = useCallback(() => setNotifOpen(false), []);

  const navSections = useMemo(
    () => navFor(role, { grants: me?.grants ?? null, hasOrg: Boolean(org) }),
    [role, me?.grants, org],
  );

  if (!ready || !user) return <FullScreenMessage>Loading…</FullScreenMessage>;

  if (!verified) {
    if (meQuery.isError) {
      return (
        <FullScreenMessage>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ErrorState
              title="Couldn't check your account"
              message={errorMessage(meQuery.error)}
              onRetry={() => void meQuery.refetch()}
              retrying={meQuery.isFetching}
            />
          </div>
        </FullScreenMessage>
      );
    }
    return <FullScreenMessage>Loading…</FullScreenMessage>;
  }

  const activeHref = activeHrefFor(navSections, pathname);

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
  const orgName = isSuperAdmin ? org?.name : me?.organisation?.name;
  const managerHint =
    role === "MANAGER" && !grants.screenshots && !grants.timeline && !grants.activity;

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
          <p className="truncate text-[13px] text-slate-400">
            {roleText}
            {orgName ? ` · ${orgName}` : ""}
          </p>
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
            className={`flex items-center px-1 ${collapsed ? "flex-col gap-2" : "justify-between"}`}
          >
            <Brand collapsed={collapsed} />
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav
            aria-label="Main"
            className="mt-5 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
          >
            <NavLinks
              sections={navSections}
              activeHref={activeHref}
              collapsed={collapsed}
              badges={badges}
            />
          </nav>

          {userCard(collapsed)}
        </div>
      </aside>

      {/* overflow-x-clip: the page-enter slide must never widen the page on a phone. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip print:block">
        <header className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:justify-end print:hidden">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
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
            <span className={isSuperAdmin ? "hidden sm:block" : ""}>
              <Brand />
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {isSuperAdmin && (
              <OrgSwitcher
                onChange={(next) => {
                  // "All organisations" has nothing to show on an organisation's page.
                  if (!next && !isOrgFreeRoute(pathname)) router.push("/dashboard/overview");
                }}
              />
            )}
            <button
              type="button"
              aria-label={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
              }
              onClick={() => setNotifOpen(true)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
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
          {managerHint && pathname === "/dashboard/overview" && (
            <p className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm">
              Your Admin hasn&apos;t given you access to screenshots, timelines or activity yet, so
              the Team page is hidden. Approvals, team breaks and reports work as usual.
            </p>
          )}
          {/* Keyed by organisation too: switching remounts the page, so nothing from
              the previous organisation stays on screen. */}
          <PageWrapper key={`${org?.id ?? ""}:${pathname}`}>
            {needsOrg ? <PickOrganisation /> : allowed ? children : null}
          </PageWrapper>
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
