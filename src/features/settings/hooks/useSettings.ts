"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSettings, updateSettings } from "@/features/settings/api/settings";
import type { AppSettingsPatch, AppSettingsView } from "@/features/settings/types";
import { approvalKeys } from "@/features/approvals/api/keys";
import { reportKeys } from "@/features/reports/api/keys";

export const settingsKeys = {
  all: ["settings"] as const,
};

export function useAppSettings(enabled = true) {
  return useQuery({ queryKey: settingsKeys.all, queryFn: getSettings, enabled });
}

/**
 * Saves a subset. The SLA and the day thresholds change approvals and reports,
 * so both are re-read after a save.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation<AppSettingsView, unknown, AppSettingsPatch>({
    mutationFn: updateSettings,
    onSuccess: (view) => {
      queryClient.setQueryData(settingsKeys.all, view);
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
