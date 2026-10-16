import type { QueryClient } from "@tanstack/react-query";

import { breakKeys } from "@/features/breaks/api/keys";

/** Notification types the break feature raises. */
export const BREAK_NOTIFICATION_TYPES = {
  APPROVAL_REQUESTED: "BREAK_APPROVAL_REQUESTED",
  APPROVALS_DIGEST: "BREAK_APPROVALS_DIGEST",
  DECIDED: "BREAK_DECIDED",
} as const;

/**
 * A break notification means some cached break data is now out of date: a new
 * request changes the approvals badge and list, a decision changes the person's
 * own break view. Refreshes just those.
 */
export function refreshForNotification(queryClient: QueryClient, type: string): void {
  switch (type) {
    case BREAK_NOTIFICATION_TYPES.APPROVAL_REQUESTED:
    case BREAK_NOTIFICATION_TYPES.APPROVALS_DIGEST:
      void queryClient.invalidateQueries({ queryKey: breakKeys.approvals() });
      void queryClient.invalidateQueries({ queryKey: breakKeys.teamAll() });
      break;
    case BREAK_NOTIFICATION_TYPES.DECIDED:
      void queryClient.invalidateQueries({ queryKey: breakKeys.mine() });
      break;
    default:
      break;
  }
}
