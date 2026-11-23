"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adjustLeave,
  cancelLeave,
  createLeave,
  decideLeave,
  getLeaveAdjustments,
  getLeaveBalances,
  getLeavePolicy,
  getLeaveRequests,
  getLeaveSummary,
  getMyLeave,
  getPersonLeave,
  patchLeavePolicy,
  previewLeave,
  setLeaveQuota,
  type DecisionMode,
} from "@/features/leave/api/leave";
import { leaveKeys } from "@/features/leave/api/keys";
import {
  cancelCompOffClaim,
  claimCompOff,
  decideCompOff,
  getCompOffClaims,
  getCompOffSummary,
  getMyCompOff,
  getPersonCompOff,
  grantCompOff,
  type CompOffDecisionMode,
} from "@/features/leave/api/compoff";
import type {
  AdjustLeaveInput,
  LeaveDraft,
  LeaveListParams,
  LeavePolicyPatch,
} from "@/features/leave/types";
import { reportKeys } from "@/features/reports/api/keys";
import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { workdayKeys } from "@/features/workday/api/keys";

export function useMyLeave(year?: number, enabled = true) {
  return useQuery({
    queryKey: leaveKeys.me(year),
    queryFn: () => getMyLeave(year),
    enabled,
    staleTime: 30_000,
  });
}

export function useLeavePolicy(enabled = true) {
  return useQuery({
    queryKey: leaveKeys.policy(),
    queryFn: getLeavePolicy,
    enabled,
    staleTime: 60_000,
  });
}

/** The live check of a draft (debounced by the caller). */
export function useLeavePreview(draft: LeaveDraft | null) {
  return useQuery({
    queryKey: leaveKeys.preview(draft),
    queryFn: () => previewLeave(draft!),
    enabled: !!draft && !!draft.startDate,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useLeaveRequests(params: LeaveListParams, enabled = true) {
  return useQuery({
    queryKey: leaveKeys.list(params),
    queryFn: () => getLeaveRequests(params),
    enabled,
    staleTime: 15_000,
  });
}

/** The nav badge: requests waiting on the caller. */
export function useLeaveSummary(companyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: leaveKeys.summary(companyId),
    queryFn: () => getLeaveSummary(companyId),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useLeaveBalances(
  params: { year?: number; companyId?: string; managerId?: string; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: leaveKeys.balances(params),
    queryFn: () => getLeaveBalances(params),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function usePersonLeave(userId: string | null, year?: number) {
  return useQuery({
    queryKey: leaveKeys.person(userId ?? "", year),
    queryFn: () => getPersonLeave(userId!, year),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function useLeaveAdjustments(
  params: { userId?: string; year?: number; companyId?: string; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: leaveKeys.adjustments(params),
    queryFn: () => getLeaveAdjustments(params),
    enabled,
    staleTime: 30_000,
  });
}

/** After any change to leave, everything that shows it reads again. */
function useRefreshLeave() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    void queryClient.invalidateQueries({ queryKey: teamTodayKeys.all });
    void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
    void queryClient.invalidateQueries({ queryKey: reportKeys.all });
  };
}

export function useApplyLeave() {
  const refresh = useRefreshLeave();
  return useMutation({ mutationFn: (draft: LeaveDraft) => createLeave(draft), onSuccess: refresh });
}

export function useCancelLeave() {
  const refresh = useRefreshLeave();
  return useMutation({ mutationFn: (id: string) => cancelLeave(id), onSuccess: refresh });
}

export function useDecideLeave() {
  const refresh = useRefreshLeave();
  return useMutation({
    mutationFn: (v: { id: string; mode: DecisionMode; note?: string }) =>
      decideLeave(v.id, v.mode, v.note),
    onSuccess: refresh,
  });
}

export function useAdjustLeave() {
  const refresh = useRefreshLeave();
  return useMutation({
    mutationFn: (input: AdjustLeaveInput) => adjustLeave(input),
    onSuccess: refresh,
  });
}

export function useSetLeaveQuota() {
  const refresh = useRefreshLeave();
  return useMutation({
    mutationFn: (v: {
      userId: string;
      body: { clslDaysPerYear?: number | null; elplDaysPerYear?: number | null };
    }) => setLeaveQuota(v.userId, v.body),
    onSuccess: refresh,
  });
}

export function useSaveLeavePolicy() {
  const refresh = useRefreshLeave();
  return useMutation({
    mutationFn: (patch: LeavePolicyPatch) => patchLeavePolicy(patch),
    onSuccess: refresh,
  });
}

// ---- Comp off (3.5) --------------------------------------------------------------------

export function useMyCompOff(enabled = true) {
  return useQuery({
    queryKey: leaveKeys.compOffMe(),
    queryFn: getMyCompOff,
    enabled,
    staleTime: 30_000,
  });
}

export function usePersonCompOff(userId: string | null) {
  return useQuery({
    queryKey: leaveKeys.compOffPerson(userId ?? ""),
    queryFn: () => getPersonCompOff(userId!),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function useCompOffClaims(
  params: {
    status?: string;
    userId?: string;
    companyId?: string;
    needsMe?: boolean;
    limit?: number;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: leaveKeys.compOffList(params),
    queryFn: () => getCompOffClaims(params),
    enabled,
    staleTime: 15_000,
  });
}

/** The badge: claims waiting on the caller. */
export function useCompOffSummary(companyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: leaveKeys.compOffSummary(companyId),
    queryFn: () => getCompOffSummary(companyId),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useClaimCompOff() {
  const refresh = useRefreshLeave();
  return useMutation({
    mutationFn: (input: { date: string; days?: number; reason: string }) => claimCompOff(input),
    onSuccess: refresh,
  });
}

export function useCancelCompOffClaim() {
  const refresh = useRefreshLeave();
  return useMutation({ mutationFn: (id: string) => cancelCompOffClaim(id), onSuccess: refresh });
}

export function useDecideCompOff() {
  const refresh = useRefreshLeave();
  return useMutation({
    mutationFn: (v: { id: string; mode: CompOffDecisionMode; days?: number; note?: string }) =>
      decideCompOff(v.id, v.mode, { days: v.days, note: v.note }),
    onSuccess: refresh,
  });
}

export function useGrantCompOff() {
  const refresh = useRefreshLeave();
  return useMutation({
    mutationFn: (input: { userId: string; date: string; days: number; reason: string }) =>
      grantCompOff(input),
    onSuccess: refresh,
  });
}
