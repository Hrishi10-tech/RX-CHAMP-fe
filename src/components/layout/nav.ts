import {
  BookOpenText,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Coffee,
  FileChartColumn,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  MousePointerClick,
  Network,
  Settings,
  UserCog,
  Users,
} from "lucide-react";

import { canAccess, isOrgFreeRoute, type Grants, type Role } from "@/constants/roles";
import type { NavSection } from "./types";

export const APPROVALS_HREF = "/dashboard/approvals";
export const CHAT_HREF = "/dashboard/chat";

/**
 * Every destination, once (SPEC 7.1). The sidebar and the phone menu both show
 * `navFor(...)`, so they always offer the same items, and an item shows only
 * when the route guard would let the person in.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Menu",
    items: [
      { href: "/dashboard/organisations", label: "Organisations", icon: Building2 },
      { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/team", label: "Team", icon: Users },
      { href: APPROVALS_HREF, label: "Approvals", icon: ClipboardCheck },
      { href: CHAT_HREF, label: "Messages", icon: MessageSquare },
    ],
  },
  {
    heading: "People",
    items: [
      { href: "/dashboard/people", label: "Team management", icon: UserCog },
      { href: "/dashboard/departments", label: "Departments", icon: Network },
    ],
  },
  {
    heading: "Time",
    items: [
      { href: "/dashboard/breaks/team", label: "Team breaks", icon: Coffee },
      { href: "/dashboard/shifts", label: "Shifts", icon: Clock3 },
      { href: "/dashboard/shifts/assign", label: "Assign shifts", icon: CalendarClock },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/dashboard/tracking", label: "Input tracking", icon: MousePointerClick },
    ],
  },
  {
    heading: "Reports",
    items: [{ href: "/dashboard/reports", label: "Reports", icon: FileChartColumn }],
  },
  {
    heading: "Organisation",
    items: [
      { href: "/dashboard/signout-keys", label: "Sign-out keys", icon: KeyRound },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/instructions", label: "Instructions", icon: BookOpenText },
    ],
  },
];

export interface NavContext {
  grants?: Grants | null;
  /** Super Admin: whether an organisation is selected. */
  hasOrg?: boolean;
}

/** The menu one person sees. */
export function navFor(role: Role | null, ctx: NavContext = {}): NavSection[] {
  const needsOrg = role === "SUPER_ADMIN" && !ctx.hasOrg;
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        canAccess(role, item.href, { grants: ctx.grants ?? null }) &&
        (!needsOrg || isOrgFreeRoute(item.href)),
    ),
  })).filter((section) => section.items.length > 0);
}

/** The item a path belongs to: the longest matching href. */
export function activeHrefFor(sections: NavSection[], pathname: string): string | undefined {
  return sections
    .flatMap((s) => s.items)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
