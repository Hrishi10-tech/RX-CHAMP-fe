import {
  BookOpenText,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarHeart,
  ClipboardCheck,
  Clock3,
  Coffee,
  FileChartColumn,
  History,
  Fingerprint,
  HeartPulse,
  House,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  MousePointerClick,
  Network,
  Settings,
  FileArchive,
  SlidersHorizontal,
  Sun,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

import {
  HISTORY_ROUTE,
  MY_CALENDAR_ROUTE,
  PROFILE_ROUTE,
  TODAY_ROUTE,
  canAccess,
  isOrgFreeRoute,
  seesEveryOrg,
  type Grants,
  type Role,
} from "@/constants/roles";
import type { MePermissions } from "@/features/auth/types";
import type { NavSection } from "./types";

export const APPROVALS_HREF = "/dashboard/approvals";
/** 3.4 */
export const LEAVE_HREF = "/dashboard/leave";
/** 3.5 */
export const WFH_HREF = "/dashboard/wfh";
export const ATTENDANCE_HREF = "/dashboard/attendance";
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
    // 3.6 (D-87, W-26): the daily jobs first, Approvals right after the live picture.
    heading: "Menu",
    items: [
      { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/team", label: "Team", icon: Users },
      { href: APPROVALS_HREF, label: "Approvals", icon: ClipboardCheck },
      { href: "/dashboard/breaks/team", label: "Team breaks", icon: Coffee },
      // 3.4: requests, balances and the policy.
      { href: LEAVE_HREF, label: "Leave", icon: CalendarHeart },
      // 3.5: requests, schedules and the policy.
      { href: WFH_HREF, label: "Work from home", icon: House },
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
    heading: "Reports",
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: FileChartColumn },
      { href: AGENT_HEALTH_HREF, label: "Agent health", icon: HeartPulse },
      { href: FOCUS_ADJUSTMENTS_HREF, label: "Focus adjustments", icon: SlidersHorizontal },
    ],
  },
  {
    // 3.6 (D-87): how the organisation runs, set up once and visited rarely.
    heading: "Setup",
    items: [
      { href: "/dashboard/shifts", label: "Shifts", icon: Clock3 },
      { href: "/dashboard/shifts/assign", label: "Assign shifts", icon: CalendarClock },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
      // 3.5: biometric attendance (the organisation's integration).
      { href: ATTENDANCE_HREF, label: "Attendance", icon: Fingerprint },
      { href: "/dashboard/tracking", label: "Input tracking", icon: MousePointerClick },
      { href: "/dashboard/organisations", label: "Organisations", icon: Building2 },
      { href: "/dashboard/signout-keys", label: "Sign-out keys", icon: KeyRound },
      // 3.2: the monthly screenshot archive and deletion (the organisation's admins).
      { href: "/dashboard/screenshots/archives", label: "Screenshot archive", icon: FileArchive },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/instructions", label: "Instructions", icon: BookOpenText },
      // 3.6: your own profile and avatar, for every portal role.
      { href: PROFILE_ROUTE, label: "Profile", icon: UserRound },
    ],
  },
];

/**
 * 4.1: Staff's menu, the phone app's tabs: their own day, leave (comp off is a tab
 * there), work from home, year, history, messages and profile. Never the admin sections,
 * even where a route is shared (Leave, Work from home): those pages show Staff their own.
 */
export const STAFF_NAV_SECTIONS: NavSection[] = [
  {
    heading: "My work",
    items: [
      { href: TODAY_ROUTE, label: "Today", icon: Sun },
      { href: LEAVE_HREF, label: "Leave", icon: CalendarHeart },
      { href: WFH_HREF, label: "Work from home", icon: House },
      { href: MY_CALENDAR_ROUTE, label: "Calendar", icon: CalendarDays },
      { href: HISTORY_ROUTE, label: "History", icon: History },
      { href: CHAT_HREF, label: "Messages", icon: MessageSquare },
    ],
  },
  {
    heading: "Account",
    items: [{ href: PROFILE_ROUTE, label: "Profile", icon: UserRound }],
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
  if (role === "USER") return STAFF_NAV_SECTIONS;
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
