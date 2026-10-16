/** Where a notification takes you when opened, by type. */
export const MY_BREAKS_PAGE = "/dashboard/me?tab=breaks";

/** 3.1 destinations (SPEC 3.10). The old approvals page redirects to the new one. */
export const APPROVALS_PAGE_31 = "/dashboard/approvals";
export const REPORTS_PAGE = "/dashboard/reports";
export const TEAM_TODAY_PAGE = "/dashboard/team-today";
export const MY_HOME_PAGE = "/dashboard/me";

/** The 3.1 notification types, as the server sends them. */
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

const T = NOTIFICATION_TYPES_31;

const LINKS: Record<string, string> = {
  // 3.0 types the 3.1 API still sends for taken breaks and overruns, and the
  // 18:30 digest: the one Approvals page now (no hop through the old address).
  BREAK_APPROVAL_REQUESTED: APPROVALS_PAGE_31,
  BREAK_APPROVALS_DIGEST: APPROVALS_PAGE_31,
  BREAK_DECIDED: MY_BREAKS_PAGE,
  // Requests and deadlines go to the approver's list.
  [T.SKIP_REQUESTED]: APPROVALS_PAGE_31,
  [T.AUTO_SKIP_REQUESTED]: APPROVALS_PAGE_31,
  [T.SKIP_COMMENT_ADDED]: APPROVALS_PAGE_31,
  [T.MEETING_REQUESTED]: APPROVALS_PAGE_31,
  [T.APPROVALS_DUE_SOON]: APPROVALS_PAGE_31,
  [T.APPROVALS_OVERDUE]: APPROVALS_PAGE_31,
  [T.APPROVALS_ESCALATED]: APPROVALS_PAGE_31,
  // A decision on someone's own meeting: their home shows what it did to focus time.
  [T.MEETING_DECIDED]: MY_HOME_PAGE,
  [T.MONTHLY_REPORT_READY]: REPORTS_PAGE,
  [T.DAY_AUTO_CLOSED]: TEAM_TODAY_PAGE,
};

/** The page a notification opens, or null for types that have nowhere to go. */
export function notificationHref(type: string): string | null {
  return LINKS[type] ?? null;
}
