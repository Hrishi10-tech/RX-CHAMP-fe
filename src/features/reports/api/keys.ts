import type { TeamDayParams, TeamMonthParams } from "@/features/reports/types";

/** React Query keys for reports, runs and month locks. */
export const reportKeys = {
  all: ["reports"] as const,
  people: () => [...reportKeys.all, "people"] as const,
  personDay: (userId: string, date: string) =>
    [...reportKeys.all, "person", userId, "day", date] as const,
  personMonth: (userId: string, month: string) =>
    [...reportKeys.all, "person", userId, "month", month] as const,
  teamDay: (params: TeamDayParams) => [...reportKeys.all, "team", "day", params] as const,
  teamMonth: (params: TeamMonthParams) => [...reportKeys.all, "team", "month", params] as const,
  runs: () => [...reportKeys.all, "runs"] as const,
  locks: () => [...reportKeys.all, "lock"] as const,
  lock: (month: string) => [...reportKeys.locks(), month] as const,
};
