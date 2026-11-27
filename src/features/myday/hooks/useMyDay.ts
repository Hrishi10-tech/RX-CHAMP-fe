"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getWorkdayToday } from "@/features/workday/api/getWorkdayToday";
import { workdayKeys } from "@/features/workday/api/keys";
import { reportKeys } from "@/features/reports/api/keys";
import { avatarKeys } from "@/features/avatars/api/avatars";
import {
  endRemoteDay,
  getMyDayReport,
  startRemoteDay,
  submitLateReason,
} from "@/features/myday/api/myDay";
import { myDayKeys } from "@/features/myday/api/keys";

/** How often Today reads the day again while it is open, as the phone app does. */
export const TODAY_REFRESH_MS = 30_000;

/**
 * The signed-in person's day (GET /workday/me/today), read every 30 s while Today is
 * open, and again on the `workday:changed` push (useNotifications).
 */
export function useWorkdayToday(enabled = true) {
  return useQuery({
    queryKey: workdayKeys.today(),
    queryFn: getWorkdayToday,
    enabled,
    refetchInterval: TODAY_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

/** One of your own days: summary, timeline, breaks, meetings, punches. */
export function useMyDayReport(date: string | null, opts: { refetchMs?: number } = {}) {
  return useQuery({
    queryKey: myDayKeys.day(date ?? ""),
    queryFn: () => getMyDayReport(date ?? ""),
    enabled: Boolean(date),
    placeholderData: keepPreviousData,
    refetchInterval: opts.refetchMs,
  });
}

/** After the day changed: Today, its status, the day page and the month read it again. */
function afterDayChange(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
  void queryClient.invalidateQueries({ queryKey: avatarKeys.dayProgress() });
  void queryClient.invalidateQueries({ queryKey: myDayKeys.all });
  void queryClient.invalidateQueries({ queryKey: [...reportKeys.all, "me"] });
}

/** 4.1: Start (or Resume) and End of a remote day, for biometric staff. */
export function useRemoteDay() {
  const queryClient = useQueryClient();
  const start = useMutation({
    mutationFn: startRemoteDay,
    onSuccess: () => afterDayChange(queryClient),
  });
  const end = useMutation({
    mutationFn: endRemoteDay,
    onSuccess: () => afterDayChange(queryClient),
  });
  return { start, end };
}

/** Why the day started late; Today, the day page and the month all read it again. */
export function useSubmitLateReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitLateReason,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
      void queryClient.invalidateQueries({ queryKey: myDayKeys.all });
      void queryClient.invalidateQueries({ queryKey: [...reportKeys.all, "me"] });
    },
  });
}
