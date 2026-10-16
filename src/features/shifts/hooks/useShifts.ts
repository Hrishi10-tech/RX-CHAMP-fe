"use client";

import { useMemo } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { breakKeys } from "@/features/breaks/api/keys";
import { assignmentKeys, shiftKeys } from "@/features/shifts/api/keys";
import { getShifts } from "@/features/shifts/api/getShifts";
import { getShift } from "@/features/shifts/api/getShift";
import { validateShift } from "@/features/shifts/api/validateShift";
import { createShift, updateShift } from "@/features/shifts/api/saveShift";
import { makeDefaultShift } from "@/features/shifts/api/makeDefaultShift";
import { deleteShift } from "@/features/shifts/api/deleteShift";
import type { UpsertShiftInput } from "@/features/shifts/types";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

/**
 * A shift or assignment change can move anyone's schedule for today, so the
 * shift lists, the assignment tabs and every break view are re-read.
 */
export function refreshScheduleData(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: shiftKeys.list() }),
    queryClient.invalidateQueries({ queryKey: [...shiftKeys.all, "detail"] }),
    queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
    queryClient.invalidateQueries({ queryKey: breakKeys.teamAll() }),
    queryClient.invalidateQueries({ queryKey: breakKeys.mine() }),
  ]);
}

export function useShifts(enabled = true) {
  return useQuery({ queryKey: shiftKeys.list(), queryFn: getShifts, enabled });
}

export function useShift(id: string | undefined) {
  return useQuery({
    queryKey: shiftKeys.detail(id ?? ""),
    queryFn: () => getShift(id as string),
    enabled: Boolean(id),
    // An open editor must not be overwritten by a background re-read.
    refetchOnWindowFocus: false,
  });
}

/**
 * Live check of the shift being edited, 400 ms after typing stops. `current` is
 * true when the answer on screen belongs to exactly what is in the form now.
 */
export function useShiftValidation(body: UpsertShiftInput | null, enabled = true) {
  const key = body ? JSON.stringify(body) : null;
  const debouncedKey = useDebouncedValue(key, 400);
  const debouncedBody = useMemo(
    () => (debouncedKey ? (JSON.parse(debouncedKey) as UpsertShiftInput) : null),
    [debouncedKey],
  );

  const query = useQuery({
    queryKey: shiftKeys.validate(debouncedBody as UpsertShiftInput),
    queryFn: ({ signal }) => validateShift(debouncedBody as UpsertShiftInput, signal),
    enabled: enabled && debouncedBody !== null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const current = key !== null && key === debouncedKey && !query.isPlaceholderData;
  return { ...query, current, checking: key !== debouncedKey || query.isFetching };
}

export function useSaveShift(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertShiftInput) => (id ? updateShift(id, body) : createShift(body)),
    onSuccess: (saved) => {
      queryClient.setQueryData(shiftKeys.detail(saved.id), saved);
      void refreshScheduleData(queryClient);
    },
  });
}

export function useMakeDefaultShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => makeDefaultShift(id),
    onSuccess: () => void refreshScheduleData(queryClient),
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShift(id),
    onSuccess: () => void refreshScheduleData(queryClient),
  });
}
