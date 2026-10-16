import type { GetTeamTodayParams } from "@/features/teamToday/types";

/** React Query keys for Team today and per-person activity by hour. */
export const teamTodayKeys = {
  all: ["team-today"] as const,
  day: (params: GetTeamTodayParams) => [...teamTodayKeys.all, params] as const,
  hourly: (userId: string, date: string) => ["activity", "hourly", userId, date] as const,
};
