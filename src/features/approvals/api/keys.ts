import type { GetApprovalsParams } from "@/features/approvals/types";

/** React Query keys for the 3.1 approvals (breaks and meetings). */
export const approvalKeys = {
  all: ["approvals"] as const,
  lists: () => [...approvalKeys.all, "list"] as const,
  list: (params: GetApprovalsParams) => [...approvalKeys.lists(), params] as const,
  /** Without options: the badge's key (and the prefix every summary is invalidated by). */
  summary: (p?: { scope?: string; companyId?: string }) =>
    p && (p.scope || p.companyId)
      ? ([
          ...approvalKeys.all,
          "summary",
          { scope: p.scope ?? "mine", companyId: p.companyId ?? "" },
        ] as const)
      : ([...approvalKeys.all, "summary"] as const),
  mine: (days: number) => [...approvalKeys.all, "me", days] as const,
};
