"use client";

import { useEffect, useRef } from "react";
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
  // Sixteen items do not always fit: keep the current page's item in view.
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [activeHref]);

  return (
    <>
      {sections.map((section, si) => (
        <div key={section.heading ?? si} className={si > 0 ? "mt-3" : ""}>
          {!collapsed && section.heading && (
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-quiet">
              {section.heading}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = href === activeHref;
              const badge = badges[href];
              const showBadge = Boolean(badge && badge.count > 0);
              return (
                <Link
                  key={href}
                  ref={active ? activeRef : undefined}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={`group relative flex items-center gap-3 rounded-[10px] py-2.5 text-[0.9375rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 ${
                    collapsed ? "justify-center px-0" : "px-3"
                  } ${
                    active ? "bg-fill text-primary" : "text-soft hover:bg-fill hover:text-primary"
                  }`}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
                  )}
                  <Icon
                    aria-hidden
                    className={`h-[22px] w-[22px] shrink-0 ${
                      active ? "text-brand" : "text-quiet group-hover:text-body"
                    }`}
                  />
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
                  {collapsed && <span className="sr-only">{label}</span>}
                  {showBadge && badge && (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-bold tabular-nums ${
                        active
                          ? "bg-brand/14 text-brand"
                          : badge.tone === "info"
                            ? "bg-brand/10 text-brand"
                            : "bg-attention text-on-brand"
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
