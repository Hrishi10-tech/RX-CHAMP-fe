import type { ListAdjustmentsParams } from "@/features/adjustments/types";

/**
 * React Query keys for manual focus adjustments. `org` is the organisation in
 * view (useOrgScope, "" for none), so switching organisations never shows the
 * previous one's trail.
 */
export const adjustmentKeys = {
  all: ["focus-adjustments"] as const,
  list: (params: ListAdjustmentsParams, org = "") =>
    [...adjustmentKeys.all, "list", org, params] as const,
  mine: (month?: string) => [...adjustmentKeys.all, "me", month ?? ""] as const,
};
