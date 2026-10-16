import type { QueryClient } from "@tanstack/react-query";

import { approvalKeys } from "@/features/approvals/api/keys";
import { NOTIFICATION_TYPES_31 } from "@/features/notifications/lib/links";
import { reportKeys } from "@/features/reports/api/keys";
import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { workdayKeys } from "@/features/workday/api/keys";

const T = NOTIFICATION_TYPES_31;

/** Something new (or newly due) for an approver: the list, the badge and Team today move. */
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

/** A decision on the person's own item: their focus time and waiting list move. */
const DECIDED_TYPES = new Set<string>(["BREAK_DECIDED", T.MEETING_DECIDED]);

/**
 * The 3.1 counterpart of the breaks feature's `refreshForNotification`: a
 * notification means some cached 3.1 data is out of date, so just that is
 * re-read. Both run for every notification.
 */
export function refreshFor31Notification(queryClient: QueryClient, type: string): void {
  if (APPROVER_TYPES.has(type)) {
    void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    void queryClient.invalidateQueries({ queryKey: teamTodayKeys.all });
    return;
  }
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
