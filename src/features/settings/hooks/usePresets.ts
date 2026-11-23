"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getReasonPresets,
  putReasonPresets,
  type PresetKind,
  type ReasonPresetsView,
} from "@/features/settings/api/presets";

export const presetKeys = { all: ["settings", "reason-presets"] as const };

/** Quick answers for every comment box; they rarely change. */
export function useReasonPresets(enabled = true) {
  return useQuery({
    queryKey: presetKeys.all,
    queryFn: getReasonPresets,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** One kind's presets, or [] while loading. */
export function usePresetsFor(kind: PresetKind, enabled = true): string[] {
  return useReasonPresets(enabled).data?.presets?.[kind] ?? [];
}

export function useSaveReasonPresets() {
  const queryClient = useQueryClient();
  return useMutation<ReasonPresetsView, unknown, Partial<Record<PresetKind, string[] | null>>>({
    mutationFn: putReasonPresets,
    onSuccess: (view) => queryClient.setQueryData(presetKeys.all, view),
  });
}
