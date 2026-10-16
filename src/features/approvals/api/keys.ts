import type { GetApprovalsParams } from "@/features/approvals/types";

/** React Query keys for the 3.1 approvals (breaks and meetings). */
export const approvalKeys = {
  all: ["approvals"] as const,
  lists: () => [...approvalKeys.all, "list"] as const,
  list: (params: GetApprovalsParams) => [...approvalKeys.lists(), params] as const,
  summary: () => [...approvalKeys.all, "summary"] as const,
  mine: (days: number) => [...approvalKeys.all, "me", days] as const,
};
