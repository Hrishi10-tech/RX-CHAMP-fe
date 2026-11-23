import type { LeaveListParams } from "@/features/leave/types";

export const leaveKeys = {
  all: ["leave"] as const,
  me: (year?: number) => [...leaveKeys.all, "me", year ?? 0] as const,
  policy: () => [...leaveKeys.all, "policy"] as const,
  preview: (draft: unknown) => [...leaveKeys.all, "preview", draft] as const,
  list: (params: LeaveListParams) => [...leaveKeys.all, "requests", params] as const,
  summary: (companyId?: string) => [...leaveKeys.all, "summary", companyId ?? ""] as const,
  balances: (params: Record<string, unknown>) => [...leaveKeys.all, "balances", params] as const,
  person: (userId: string, year?: number) =>
    [...leaveKeys.all, "person", userId, year ?? 0] as const,
  adjustments: (params: Record<string, unknown>) =>
    [...leaveKeys.all, "adjustments", params] as const,
};
