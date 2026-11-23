"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelWfh,
  createWfh,
  createWfhSchedule,
  decideWfh,
  endWfhSchedule,
  getMyWfh,
  getWfhPolicy,
  getWfhRequests,
  getWfhSchedules,
  getWfhSummary,
  patchWfhPolicy,
  previewWfh,
  skipWfhScheduleDay,
  updateWfhSchedule,
  type WfhDecisionMode,
} from "@/features/wfh/api/wfh";
import { wfhKeys } from "@/features/wfh/api/keys";
import type {
  WfhDraft,
  WfhListParams,
  WfhPolicyPatch,
  WfhScheduleInput,
} from "@/features/wfh/types";
import { reportKeys } from "@/features/reports/api/keys";
import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { workdayKeys } from "@/features/workday/api/keys";

export function useMyWfh(enabled = true) {
  return useQuery({ queryKey: wfhKeys.me(), queryFn: getMyWfh, enabled, staleTime: 30_000 });
}

export function useWfhPolicy(enabled = true) {
  return useQuery({
    queryKey: wfhKeys.policy(),
    queryFn: getWfhPolicy,
    enabled,
    staleTime: 60_000,
  });
}

/** The live check of a draft (debounced by the caller). */
export function useWfhPreview(draft: WfhDraft | null) {
  return useQuery({
    queryKey: wfhKeys.preview(draft),
    queryFn: () => previewWfh(draft!),
    enabled: !!draft && !!draft.startDate,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useWfhRequests(params: WfhListParams, enabled = true) {
  return useQuery({
    queryKey: wfhKeys.list(params),
    queryFn: () => getWfhRequests(params),
    enabled,
    staleTime: 15_000,
  });
}

/** The nav badge: requests waiting on the caller. */
export function useWfhSummary(companyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: wfhKeys.summary(companyId),
    queryFn: () => getWfhSummary(companyId),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useWfhSchedules(
  params: { userId?: string; companyId?: string; includeEnded?: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: wfhKeys.schedules(params),
    queryFn: () => getWfhSchedules(params),
    enabled,
    staleTime: 15_000,
  });
}

/** After any change to work from home, everything that shows it reads again. */
function useRefreshWfh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: wfhKeys.all });
    void queryClient.invalidateQueries({ queryKey: teamTodayKeys.all });
    void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
    void queryClient.invalidateQueries({ queryKey: reportKeys.all });
  };
}

export function useAskWfh() {
  const refresh = useRefreshWfh();
  return useMutation({ mutationFn: (draft: WfhDraft) => createWfh(draft), onSuccess: refresh });
}

export function useCancelWfh() {
  const refresh = useRefreshWfh();
  return useMutation({ mutationFn: (id: string) => cancelWfh(id), onSuccess: refresh });
}

export function useDecideWfh() {
  const refresh = useRefreshWfh();
  return useMutation({
    mutationFn: (v: { id: string; mode: WfhDecisionMode; note?: string }) =>
      decideWfh(v.id, v.mode, v.note),
    onSuccess: refresh,
  });
}

export function useSaveWfhSchedule() {
  const refresh = useRefreshWfh();
  return useMutation({
    mutationFn: (v: { id?: string; input: WfhScheduleInput }) =>
      v.id ? updateWfhSchedule(v.id, v.input) : createWfhSchedule(v.input),
    onSuccess: refresh,
  });
}

export function useEndWfhSchedule() {
  const refresh = useRefreshWfh();
  return useMutation({ mutationFn: (id: string) => endWfhSchedule(id), onSuccess: refresh });
}

export function useSkipWfhScheduleDay() {
  const refresh = useRefreshWfh();
  return useMutation({
    mutationFn: (v: { id: string; date: string; skip: boolean }) =>
      skipWfhScheduleDay(v.id, v.date, v.skip),
    onSuccess: refresh,
  });
}

export function useSaveWfhPolicy() {
  const refresh = useRefreshWfh();
  return useMutation({
    mutationFn: (patch: WfhPolicyPatch) => patchWfhPolicy(patch),
    onSuccess: refresh,
  });
}
