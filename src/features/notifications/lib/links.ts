/** Where a notification takes you when opened, by type (SPEC 7.1 pages). */
export const APPROVALS_PAGE = "/dashboard/approvals";
export const REPORTS_PAGE = "/dashboard/reports";
export const TEAM_PAGE = "/dashboard/team";
export const OVERVIEW_PAGE = "/dashboard/overview";
export const CALENDAR_PAGE = "/dashboard/calendar";

/** @deprecated 3.1 name, kept for older imports. */
export const APPROVALS_PAGE_31 = APPROVALS_PAGE;

/** The notification types, as the server sends them. */
export const NOTIFICATION_TYPES_31 = {
  SKIP_REQUESTED: "SKIP_REQUESTED",
  AUTO_SKIP_REQUESTED: "AUTO_SKIP_REQUESTED",
  SKIP_COMMENT_ADDED: "SKIP_COMMENT_ADDED",
  MEETING_REQUESTED: "MEETING_REQUESTED",
  MEETING_DECIDED: "MEETING_DECIDED",
  APPROVALS_DUE_SOON: "APPROVALS_DUE_SOON",
  APPROVALS_OVERDUE: "APPROVALS_OVERDUE",
  APPROVALS_ESCALATED: "APPROVALS_ESCALATED",
  MONTHLY_REPORT_READY: "MONTHLY_REPORT_READY",
  DAY_AUTO_CLOSED: "DAY_AUTO_CLOSED",
} as const;

/** 4.0 types: away approvals and the calendar. */
export const NOTIFICATION_TYPES_40 = {
  AWAY_REQUESTED: "AWAY_REQUESTED",
  AWAY_DECIDED: "AWAY_DECIDED",
  CALENDAR_CHANGED: "CALENDAR_CHANGED",
} as const;

const T = NOTIFICATION_TYPES_31;
const T4 = NOTIFICATION_TYPES_40;

const LINKS: Record<string, string> = {
  // 3.0 types the API still sends for taken breaks and overruns, and the
  // 18:30 digest: the one Approvals page.
  BREAK_APPROVAL_REQUESTED: APPROVALS_PAGE,
  BREAK_APPROVALS_DIGEST: APPROVALS_PAGE,
  // Requests and deadlines go to the approver's list.
  [T.SKIP_REQUESTED]: APPROVALS_PAGE,
  [T.AUTO_SKIP_REQUESTED]: APPROVALS_PAGE,
  [T.SKIP_COMMENT_ADDED]: APPROVALS_PAGE,
  [T.MEETING_REQUESTED]: APPROVALS_PAGE,
  [T.APPROVALS_DUE_SOON]: APPROVALS_PAGE,
  [T.APPROVALS_OVERDUE]: APPROVALS_PAGE,
  [T.APPROVALS_ESCALATED]: APPROVALS_PAGE,
  [T4.AWAY_REQUESTED]: APPROVALS_PAGE,
  [T.MONTHLY_REPORT_READY]: REPORTS_PAGE,
  [T.DAY_AUTO_CLOSED]: TEAM_PAGE,
  [T4.CALENDAR_CHANGED]: CALENDAR_PAGE,
  // A decision on someone's own break, meeting or away time is read in the RX
  // Vision app's History (4.0 has no personal page in the portal), so
  // BREAK_DECIDED, MEETING_DECIDED and AWAY_DECIDED have nowhere to go here.
};

/** The page a notification opens, or null for types that have nowhere to go. */
export function notificationHref(type: string): string | null {
  return LINKS[type] ?? null;
}
