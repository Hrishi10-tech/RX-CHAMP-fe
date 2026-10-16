"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { breakKeys } from "@/features/breaks/api/keys";
import { getTeamBreaks } from "@/features/breaks/api/getTeamBreaks";
import type { GetTeamBreaksParams } from "@/features/breaks/types";

/** One team's breaks for one day; re-read every minute so "Open" and "In progress" stay true. */
export function useTeamBreaks(params: GetTeamBreaksParams, enabled = true) {
  return useQuery({
    queryKey: breakKeys.team(params),
    queryFn: () => getTeamBreaks(params),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}
