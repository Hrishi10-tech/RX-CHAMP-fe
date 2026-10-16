"use client";

import Link from "next/link";

import type { NavSection } from "./types";

export interface NavBadge {
  count: number;
  /** Screen-reader text, e.g. "3 breaks waiting for approval". */
  label: string;
  /** "alert" (red, the default) asks for attention; "info" is a quiet count. */
  tone?: "alert" | "info";
}

/**
 * The sidebar's sections and links, shared by the desktop rail and the mobile
 * drawer so both always offer exactly the same destinations.
 */
export function NavLinks({
  sections,
  activeHref,
  collapsed = false,
  badges = {},
  onNavigate,
}: {
  sections: NavSection[];
  activeHref?: string;
  collapsed?: boolean;
  badges?: Record<string, NavBadge | undefined>;
  onNavigate?: () => void;
}) {
  return (
    <>
      {sections.map((section, si) => (
        <div key={section.heading ?? si} className={si > 0 ? "mt-4" : ""}>
          {!collapsed && section.heading && (
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {section.heading}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = href === activeHref;
              const badge = badges[href];
              const showBadge = Boolean(badge && badge.count > 0);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl py-3 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
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
                    aria-hidden
                    className={`h-[22px] w-[22px] shrink-0 ${
                      active ? "text-white" : "text-slate-500 group-hover:text-slate-700"
                    }`}
                  />
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
                  {collapsed && <span className="sr-only">{label}</span>}
                  {showBadge && badge && (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                        active
                          ? "bg-white text-[rgb(34_34_204)]"
                          : badge.tone === "info"
                            ? "bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]"
                            : "bg-red-500 text-white"
                      } ${collapsed ? "absolute right-1.5 top-1.5" : ""}`}
                    >
                      <span aria-hidden>{badge.count > 99 ? "99+" : badge.count}</span>
                      <span className="sr-only">{badge.label}</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
