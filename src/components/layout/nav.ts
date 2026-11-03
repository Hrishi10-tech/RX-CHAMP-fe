import {
  BookOpenText,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Coffee,
  FileChartColumn,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  MousePointerClick,
  Network,
  Settings,
  SlidersHorizontal,
  UserCog,
  Users,
} from "lucide-react";

import { canAccess, isOrgFreeRoute, seesEveryOrg, type Grants, type Role } from "@/constants/roles";
import type { MePermissions } from "@/features/auth/types";
import type { NavSection } from "./types";

export const APPROVALS_HREF = "/dashboard/approvals";
export const CHAT_HREF = "/dashboard/chat";
export const AGENT_HEALTH_HREF = "/dashboard/agent-health";
export const FOCUS_ADJUSTMENTS_HREF = "/dashboard/focus-adjustments";

/** Items shown only when GET /me grants the named permission (3.3). */
const PERMISSION_GATES: Record<string, keyof MePermissions> = {
  [AGENT_HEALTH_HREF]: "canSeeAgentHealth",
  // 3.3: the Super Manager's correction tool. Admins and Managers read the trail
  // from a person's day report (the page itself is open to every portal role).
  [FOCUS_ADJUSTMENTS_HREF]: "canAdjustFocus",
};

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
      { href: AGENT_HEALTH_HREF, label: "Agent health", icon: HeartPulse },
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
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: FileChartColumn },
      { href: FOCUS_ADJUSTMENTS_HREF, label: "Focus adjustments", icon: SlidersHorizontal },
    ],
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
  /** Super Admin, Super Manager: whether an organisation is selected. */
  hasOrg?: boolean;
  /** GET /me permissions: items in PERMISSION_GATES show only when theirs is true. */
  permissions?: Partial<MePermissions> | null;
}

/** The menu one person sees. */
export function navFor(role: Role | null, ctx: NavContext = {}): NavSection[] {
  const needsOrg = seesEveryOrg(role) && !ctx.hasOrg;
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        canAccess(role, item.href, { grants: ctx.grants ?? null }) &&
        (!PERMISSION_GATES[item.href] || ctx.permissions?.[PERMISSION_GATES[item.href]] === true) &&
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
