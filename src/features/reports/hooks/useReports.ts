"use client";

import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { reportKeys } from "@/features/reports/api/keys";
import {
  getMonthLock,
  getPersonDayReport,
  getPersonMonthReport,
  getReportPeople,
  getReportRuns,
  getTeamDayReport,
  getTeamMonthReport,
  lockMonth,
  unlockMonth,
} from "@/features/reports/api/reports";
import type { MonthLockView, TeamDayParams, TeamMonthParams } from "@/features/reports/types";
import { approvalKeys } from "@/features/approvals/api/keys";

/** Who the caller may report on (Managers: their staff; Super Admins: everyone). */
export function useReportPeople(enabled = true) {
  return useQuery({
    queryKey: reportKeys.people(),
    queryFn: getReportPeople,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePersonDayReport(userId: string, date: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.personDay(userId, date),
    queryFn: () => getPersonDayReport(userId, date),
    enabled: enabled && Boolean(userId && date),
    placeholderData: keepPreviousData,
  });
}

export function usePersonMonthReport(userId: string, month: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.personMonth(userId, month),
    queryFn: () => getPersonMonthReport(userId, month),
    enabled: enabled && Boolean(userId && month),
    placeholderData: keepPreviousData,
  });
}

export function useTeamDayReport(params: TeamDayParams, enabled = true) {
  return useQuery({
    queryKey: reportKeys.teamDay(params),
    queryFn: () => getTeamDayReport(params),
    enabled: enabled && Boolean(params.date),
    placeholderData: keepPreviousData,
  });
}

export function useTeamMonthReport(params: TeamMonthParams, enabled = true) {
  return useQuery({
    queryKey: reportKeys.teamMonth(params),
    queryFn: () => getTeamMonthReport(params),
    enabled: enabled && Boolean(params.month),
    placeholderData: keepPreviousData,
  });
}

export function useReportRuns(enabled = true) {
  return useQuery({ queryKey: reportKeys.runs(), queryFn: getReportRuns, enabled });
}

export function useMonthLock(month: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.lock(month),
    queryFn: () => getMonthLock(month),
    enabled: enabled && Boolean(month),
  });
}

/** Lock state for several months at once (the monthly reports list). */
export function useMonthLocks(months: string[], enabled = true) {
  return useQueries({
    queries: months.map((month) => ({
      queryKey: reportKeys.lock(month),
      queryFn: () => getMonthLock(month),
      enabled: enabled && Boolean(month),
    })),
  });
}

/** Lock or unlock a month (Super Admin); every report of it is re-read afterwards. */
export function useMonthLockMutation() {
  const queryClient = useQueryClient();
  return useMutation<MonthLockView, unknown, { month: string; locked: boolean }>({
    mutationFn: ({ month, locked }) => (locked ? lockMonth(month) : unlockMonth(month)),
    onSuccess: (view) => {
      queryClient.setQueryData(reportKeys.lock(view.month), view);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
      // Locked items become read-only in Approvals.
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}
