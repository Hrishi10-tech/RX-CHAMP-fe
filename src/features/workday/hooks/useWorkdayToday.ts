"use client";

import { useQuery } from "@tanstack/react-query";

import { workdayKeys } from "@/features/workday/api/keys";
import { getWorkdayToday } from "@/features/workday/api/getWorkdayToday";

/** Today's focus time, re-read every minute; the card ticks locally in between. */
export function useWorkdayToday(enabled = true) {
  return useQuery({
    queryKey: workdayKeys.today(),
    queryFn: getWorkdayToday,
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
