"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { getTeamToday } from "@/features/teamToday/api/getTeamToday";
import { getUserHourly } from "@/features/activity/api/getUserHourly";
import type { GetTeamTodayParams } from "@/features/teamToday/types";

/** Team today; refreshed every 60 s while it shows today, left alone for a past day. */
export function useTeamToday(params: GetTeamTodayParams, isToday: boolean, enabled = true) {
  return useQuery({
    queryKey: teamTodayKeys.day(params),
    queryFn: () => getTeamToday(params),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: isToday ? 60_000 : false,
    refetchOnWindowFocus: isToday,
  });
}

/** One person's activity by hour (managers and Super Admins only). */
export function useUserHourly(userId: string | undefined, date: string, enabled = true) {
  return useQuery({
    queryKey: teamTodayKeys.hourly(userId ?? "", date),
    queryFn: () => getUserHourly(userId as string, date),
    enabled: enabled && Boolean(userId),
  });
}
