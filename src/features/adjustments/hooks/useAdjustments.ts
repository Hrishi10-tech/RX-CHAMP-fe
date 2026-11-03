"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdjustment,
  getAdjustments,
  getMyAdjustments,
  voidAdjustment,
} from "@/features/adjustments/api/adjustments";
import { adjustmentKeys } from "@/features/adjustments/api/keys";
import type { AdjustFocusInput, ListAdjustmentsParams } from "@/features/adjustments/types";
import { reportKeys } from "@/features/reports/api/keys";
import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { workdayKeys } from "@/features/workday/api/keys";
import { useOrgScope } from "@/lib/org/selection";

export function useAdjustments(params: ListAdjustmentsParams, enabled = true) {
  const org = useOrgScope();
  return useQuery({
    queryKey: adjustmentKeys.list(params, org),
    queryFn: () => getAdjustments(params),
    enabled,
    staleTime: 15_000,
  });
}

export function useMyAdjustments(month?: string, enabled = true) {
  return useQuery({
    queryKey: adjustmentKeys.mine(month),
    queryFn: () => getMyAdjustments(month),
    enabled,
    staleTime: 60_000,
  });
}

/** After a change, everything that shows focus time reads again. */
function useRefreshFocus() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adjustmentKeys.all });
    void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    void queryClient.invalidateQueries({ queryKey: teamTodayKeys.all });
    void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
  };
}

export function useCreateAdjustment() {
  const refresh = useRefreshFocus();
  return useMutation({
    mutationFn: (input: AdjustFocusInput) => createAdjustment(input),
    onSuccess: refresh,
  });
}

export function useVoidAdjustment() {
  const refresh = useRefreshFocus();
  return useMutation({
    mutationFn: (id: string) => voidAdjustment(id),
    onSuccess: refresh,
  });
}
