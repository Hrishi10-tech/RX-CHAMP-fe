"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  MessageSquare,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { useSession } from "@/features/auth/hooks/useSession";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { canAccess, type Role } from "@/constants/roles";
import { UserMenu } from "@/components/layout/UserMenu";
import PageWrapper from "@/components/layout/PageWrapper";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import type { NavSection } from "@/components/layout/types";

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
      { href: "/dashboard/chat", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    heading: "Manage",
    items: [
      {
        href: "/dashboard/admin/team-management/organization",
        label: "Companies",
        icon: Building2,
      },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  MANAGER: "Manager",
  USER: "Member",
};

function initialsOf(nameOrEmail: string): string {
  return (
    nameOrEmail
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U"
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(
    ready && !!user,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/auth/login");
  }, [ready, user, router]);

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

  const displayName = user.name ?? user.email ?? "User";
  const initials = initialsOf(displayName);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 p-3 lg:block ${
          collapsed ? "w-24" : "w-72"
        }`}
      >
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div
            className={`flex items-center px-1 ${collapsed ? "justify-center" : "justify-between"}`}
          >
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(74_74_230)] to-[rgb(34_34_204)] text-white shadow-sm shadow-[rgba(34,34,204,0.35)]">
                <Clock className="h-5 w-5" />
              </span>
              {!collapsed && (
                <span className="text-lg font-bold tracking-tight text-slate-900">Rx Vision</span>
              )}
            </Link>
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

          <nav className="mt-6 flex flex-1 flex-col gap-1.5 overflow-y-auto">
            {navSections.map((section, si) => (
              <div key={section.heading ?? si} className={si > 0 ? "mt-4" : ""}>
                {!collapsed && section.heading && (
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {section.heading}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  {section.items.map(({ href, label, icon: Icon }) => {
                    const active = href === activeHref;
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? label : undefined}
                        className={`group relative flex items-center gap-3 rounded-xl py-3.5 text-[15px] font-semibold transition ${
                          collapsed ? "justify-center px-0" : "px-3"
                        } ${
                          active
                            ? "bg-gradient-to-r from-[rgb(34_34_204)] to-[rgb(74_74_230)] text-white shadow-md shadow-[rgba(34,34,204,0.3)]"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {active && !collapsed && (
                          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white/80" />
                        )}
                        <Icon
                          className={`h-[22px] w-[22px] shrink-0 ${
                            active ? "text-white" : "text-slate-500 group-hover:text-slate-700"
                          }`}
                        />
                        {!collapsed && <span className="flex-1 truncate">{label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div
            className={`mt-3 flex items-center gap-2.5 rounded-2xl border border-slate-200 p-3 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(74_74_230)] to-[rgb(34_34_204)] text-xs font-semibold text-white">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-slate-900">{displayName}</p>
                  <p className="truncate text-[13px] text-slate-400">
                    {role ? ROLE_LABEL[role] : "Member"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </>
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 hover:text-slate-700"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[rgb(34_34_204)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-slate-100">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <UserMenu />
        </header>

        <main className="min-w-0 flex-1 px-6 pb-8">
          <PageWrapper key={pathname}>{children}</PageWrapper>
        </main>
      </div>

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </div>
  );
}
