"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addPunch,
  createKey,
  getAttendancePeople,
  getAttendanceStatus,
  getBiometricSettings,
  getDevices,
  getKeys,
  getPunches,
  getUnmatchedCodes,
  importPunchesCsv,
  patchBiometricSettings,
  revokeKey,
  runPull,
  setAttendancePeople,
  testPull,
  voidPunch,
} from "@/features/attendance/api/attendance";
import type {
  AttendancePeopleQuery,
  BiometricSettingsPatch,
  PunchesQuery,
  SetAttendanceItem,
} from "@/features/attendance/types";
import { agentHealthKeys } from "@/features/agentHealth/api/agentHealth";
import { reportKeys } from "@/features/reports/api/keys";
import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { workdayKeys } from "@/features/workday/api/keys";

/**
 * 4.0: the query client hashes every key with the organisation in view, so one
 * organisation's integration never shows in another's.
 */
export const attendanceKeys = {
  all: ["attendance"] as const,
  status: () => [...attendanceKeys.all, "status"] as const,
  people: (params: AttendancePeopleQuery) => [...attendanceKeys.all, "people", params] as const,
  punches: (q: PunchesQuery) => [...attendanceKeys.all, "punches", q] as const,
  unmatched: () => [...attendanceKeys.all, "unmatched"] as const,
  devices: () => [...attendanceKeys.all, "devices"] as const,
  keys: () => [...attendanceKeys.all, "keys"] as const,
  settings: () => [...attendanceKeys.all, "settings"] as const,
};

export function useAttendanceStatus(enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.status(),
    queryFn: getAttendanceStatus,
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useAttendancePeople(params: AttendancePeopleQuery, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.people(params),
    queryFn: () => getAttendancePeople(params),
    enabled,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function usePunches(q: PunchesQuery, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.punches(q),
    queryFn: () => getPunches(q),
    enabled,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useUnmatchedCodes(enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.unmatched(),
    queryFn: getUnmatchedCodes,
    enabled,
    staleTime: 15_000,
  });
}

export function useDevices(enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.devices(),
    queryFn: getDevices,
    enabled,
    staleTime: 15_000,
  });
}

/** The organisation's admins only (the API refuses the Super Manager). */
export function useIntegrationKeys(enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.keys(),
    queryFn: getKeys,
    enabled,
    staleTime: 15_000,
  });
}

export function useBiometricSettings(enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.settings(),
    queryFn: getBiometricSettings,
    enabled,
    staleTime: 30_000,
  });
}

/** A change to who checks in how, or to the punches, shows in every day view. */
function useRefreshAttendance() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    void queryClient.invalidateQueries({ queryKey: teamTodayKeys.all });
    void queryClient.invalidateQueries({ queryKey: workdayKeys.all });
    void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    void queryClient.invalidateQueries({ queryKey: agentHealthKeys.all });
  };
}

export function useSetAttendancePeople() {
  const refresh = useRefreshAttendance();
  return useMutation({
    mutationFn: (items: SetAttendanceItem[]) => setAttendancePeople(items),
    onSuccess: refresh,
  });
}

export function useAddPunch() {
  const refresh = useRefreshAttendance();
  return useMutation({
    mutationFn: (input: { userId: string; time: string; direction?: string; note: string }) =>
      addPunch(input),
    onSuccess: refresh,
  });
}

export function useVoidPunch() {
  const refresh = useRefreshAttendance();
  return useMutation({
    mutationFn: (v: { id: string; reason: string }) => voidPunch(v.id, v.reason),
    onSuccess: refresh,
  });
}

export function useImportPunches() {
  const refresh = useRefreshAttendance();
  return useMutation({ mutationFn: (csv: string) => importPunchesCsv(csv), onSuccess: refresh });
}

export function useCreateKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createKey(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.keys() });
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.status() });
    },
  });
}

export function useRevokeKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeKey(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.keys() });
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.status() });
    },
  });
}

export function useSaveBiometricSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: BiometricSettingsPatch) => patchBiometricSettings(patch),
    onSuccess: (res) => {
      queryClient.setQueryData(attendanceKeys.settings(), res.settings);
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.status() });
      // 3.6: the integration switch decides which days of biometric staff payroll counts.
      if (res.changed.includes("integrationOn")) {
        void queryClient.invalidateQueries({ queryKey: reportKeys.all });
      }
    },
  });
}

export function useTestPull() {
  return useMutation({ mutationFn: () => testPull() });
}

export function useRunPull() {
  const refresh = useRefreshAttendance();
  return useMutation({ mutationFn: () => runPull(), onSuccess: refresh });
}
