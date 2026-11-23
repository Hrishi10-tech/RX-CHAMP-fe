import type { QueryClient } from "@tanstack/react-query";

import { approvalKeys } from "@/features/approvals/api/keys";
import { breakKeys } from "@/features/breaks/api/keys";
import { leaveKeys } from "@/features/leave/api/keys";
import { NOTIFICATION_TYPES_31 } from "@/features/notifications/lib/links";
import { reportKeys } from "@/features/reports/api/keys";
import { wfhKeys } from "@/features/wfh/api/keys";
import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { workdayKeys } from "@/features/workday/api/keys";

const T = NOTIFICATION_TYPES_31;

/**
 * Something new (or newly due) for an approver: the list, the badge and Team today move.
 * The event that comes with most of them says the same, so they share its refresher.
 */
const APPROVER_TYPES = new Set<string>([
  "BREAK_APPROVAL_REQUESTED",
  "BREAK_APPROVALS_DIGEST",
  T.SKIP_REQUESTED,
  T.AUTO_SKIP_REQUESTED,
  T.SKIP_COMMENT_ADDED,
  T.MEETING_REQUESTED,
  T.APPROVALS_DUE_SOON,
  T.APPROVALS_OVERDUE,
  T.APPROVALS_ESCALATED,
]);

export function isApproverNotice(type: string): boolean {
  return APPROVER_TYPES.has(type);
}

/** A decision on the person's own item: their focus time and waiting list move. */
const DECIDED_TYPES = new Set<string>(["BREAK_DECIDED", T.MEETING_DECIDED]);

/**
 * The 3.1 counterpart of the breaks feature's `refreshForNotification`: a
 * notification means some cached 3.1 data is out of date, so just that is
 * re-read. Both run for every notification. An approver's notice re-reads through
 * createApprovalsRefresher instead: see `isApproverNotice`.
 */
export function refreshFor31Notification(queryClient: QueryClient, type: string): void {
  if (DECIDED_TYPES.has(type)) {
    void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
    void queryClient.invalidateQueries({ queryKey: [...approvalKeys.all, "me"] });
    return;
  }
  if (type === T.MONTHLY_REPORT_READY) {
    void queryClient.invalidateQueries({ queryKey: reportKeys.runs() });
    return;
  }
  if (type === T.DAY_AUTO_CLOSED) {
    void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
    void queryClient.invalidateQueries({ queryKey: teamTodayKeys.all });
  }
}

/**
 * The socket event `approvals:changed` (3.6): an approval item changed, on any device.
 * 4.0 adds AWAY, away time the agent's pop-up sent for approval, which the approvals
 * list holds beside breaks and meetings.
 */
export interface ApprovalsChanged {
  what: string;
  id: string;
  action?: string;
  needsYou?: boolean;
  at?: string;
}

/** Every kind of approval item, for when any of them may have changed. */
export const APPROVAL_KINDS = ["BREAK", "MEETING", "AWAY", "LEAVE", "WFH", "COMPOFF"] as const;

/** 4.0: the Team page and the Overview show what waits and who is out today. */
const TEAM_KEY = ["team"] as const;
const OVERVIEW_KEY = ["overview"] as const;

/**
 * Re-reads what shows these kinds of item, the same data a decision made on this
 * page re-reads: the list and badge of each kind, and what the decision moves
 * (Team today, the person's day, the reports, and in 4.0 the Team page and the
 * Overview). One the portal does not know yet refreshes those only. A tab nobody is
 * looking at only marks them out of date, as its polls pause too, and re-reads when it
 * is looked at again.
 */
export function refreshForApprovalChange(queryClient: QueryClient, kinds: Iterable<string>): void {
  const seen = new Set(kinds);
  if (seen.size === 0) return;
  const refetchType = typeof document !== "undefined" && document.hidden ? "none" : "active";
  const refresh = (queryKey: readonly unknown[]) =>
    void queryClient.invalidateQueries({ queryKey, refetchType });
  if (seen.has("BREAK") || seen.has("MEETING") || seen.has("AWAY")) {
    refresh(approvalKeys.all);
    // The 3.0 break views read the same records.
    refresh(breakKeys.all);
  }
  if (seen.has("LEAVE") || seen.has("COMPOFF")) refresh(leaveKeys.all);
  if (seen.has("WFH")) refresh(wfhKeys.all);
  refresh(teamTodayKeys.all);
  refresh(workdayKeys.all);
  refresh(reportKeys.all);
  refresh(TEAM_KEY);
  refresh(OVERVIEW_KEY);
}

/** How long a burst of changes (a bulk approve) is gathered into one refresh. */
export const APPROVALS_REFRESH_WAIT_MS = 300;

/**
 * The least time between two refreshes. The Super Manager and the Super Admins hear every
 * item in every organisation, and one refresh of the Overview reads the summary four
 * times: without this a busy stretch uses up its 120 a minute, and every badge freezes.
 */
export const APPROVALS_REFRESH_GAP_MS = 5_000;

/**
 * Gathers `approvals:changed` events into one refresh: a bulk approve of fifty items
 * sends fifty events, and each refresh would cancel the reads of the one before it.
 * The first change after a quiet spell shows within `waitMs`; during a busy stretch
 * they are read once per `gapMs`, the last of them included.
 */
export function createApprovalsRefresher(
  queryClient: () => QueryClient,
  waitMs: number = APPROVALS_REFRESH_WAIT_MS,
  gapMs: number = APPROVALS_REFRESH_GAP_MS,
): { add: (kind: string) => void; cancel: () => void } {
  const waiting = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastAt = Number.NEGATIVE_INFINITY;
  return {
    add(kind) {
      waiting.add(kind);
      if (timer) return;
      timer = setTimeout(
        () => {
          timer = null;
          lastAt = Date.now();
          const kinds = [...waiting];
          waiting.clear();
          refreshForApprovalChange(queryClient(), kinds);
        },
        Math.max(waitMs, lastAt + gapMs - Date.now()),
      );
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      waiting.clear();
    },
  };
}
