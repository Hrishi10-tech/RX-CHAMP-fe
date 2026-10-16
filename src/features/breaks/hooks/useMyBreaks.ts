"use client";

import { useQuery } from "@tanstack/react-query";

import { breakKeys } from "@/features/breaks/api/keys";
import { getMyBreakDay } from "@/features/breaks/api/getMyBreakDay";
import { getMyBreakHistory } from "@/features/breaks/api/getMyBreakHistory";

export function useMyBreakDay(enabled = true) {
  return useQuery({
    queryKey: breakKeys.myToday(),
    queryFn: getMyBreakDay,
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMyBreakHistory(days = 14, enabled = true) {
  return useQuery({
    queryKey: breakKeys.myHistory(days),
    queryFn: () => getMyBreakHistory(days),
    enabled,
  });
}
