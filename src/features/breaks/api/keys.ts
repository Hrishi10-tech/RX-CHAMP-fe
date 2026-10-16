import type { GetApprovalsParams, GetTeamBreaksParams } from "@/features/breaks/types";

/** React Query keys for breaks, approvals and the team day. */
export const breakKeys = {
  all: ["breaks"] as const,
  approvals: () => [...breakKeys.all, "approvals"] as const,
  approvalList: (params: GetApprovalsParams) => [...breakKeys.approvals(), "list", params] as const,
  approvalSummary: () => [...breakKeys.approvals(), "summary"] as const,
  team: (params: GetTeamBreaksParams) => [...breakKeys.all, "team", params] as const,
  teamAll: () => [...breakKeys.all, "team"] as const,
  mine: () => [...breakKeys.all, "me"] as const,
  myToday: () => [...breakKeys.mine(), "today"] as const,
  myHistory: (days: number) => [...breakKeys.mine(), "history", days] as const,
};
