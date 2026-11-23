import { apiClient, type ApiResponse } from "@/lib/api";
import { cleanParams, readItems, unwrap } from "@/lib/api/list";
import type {
  AttendancePeopleQuery,
  BiometricSettingsPatch,
  BiometricSettingsView,
  BiometricStatusView,
  DeviceView,
  IngestResult,
  KeyView,
  PersonAttendanceView,
  PullRunResult,
  PunchesQuery,
  PunchView,
  SetAttendanceItem,
  UnmatchedCodeView,
} from "@/features/attendance/types";

/**
 * 4.0: every call is the organisation's in view, which the API client sends as
 * X-Org-Id (the API refuses a call without one). Reading: the organisation's admins
 * and the Super Manager; changing: the admins (the Super Manager adds and voids punches).
 */
const BASE = "/api/v1/biometric";

export async function getAttendanceStatus(): Promise<BiometricStatusView> {
  const { data } = await apiClient.get<ApiResponse<BiometricStatusView>>(`${BASE}/status`);
  return unwrap(data, "Failed to load the attendance status");
}

export async function getAttendancePeople(
  params: AttendancePeopleQuery,
): Promise<PersonAttendanceView[]> {
  const { data } = await apiClient.get<ApiResponse<PersonAttendanceView[]>>(`${BASE}/people`, {
    // 4.0: no companyId; the people are the organisation's in view.
    params: cleanParams({ search: params.search, source: params.source }),
  });
  return readItems<PersonAttendanceView>(unwrap(data, "Failed to load the people"));
}

export async function setAttendancePeople(
  items: SetAttendanceItem[],
): Promise<{ updated: PersonAttendanceView[]; rematched: number }> {
  const { data } = await apiClient.put<
    ApiResponse<{ updated: PersonAttendanceView[]; rematched: number }>
  >(`${BASE}/people`, { items });
  return unwrap(data, "Failed to save");
}

export async function getPunches(q: PunchesQuery): Promise<{ items: PunchView[]; total: number }> {
  const { data } = await apiClient.get<ApiResponse<{ items: PunchView[]; total: number }>>(
    `${BASE}/punches`,
    {
      params: cleanParams({
        from: q.from,
        to: q.to,
        userId: q.userId,
        code: q.code,
        deviceId: q.deviceId,
        unmatched: q.unmatched ? "true" : undefined,
        includeVoided: q.includeVoided ? "true" : undefined,
        limit: q.limit,
      }),
    },
  );
  const body = unwrap(data, "Failed to load the punches");
  return { items: readItems<PunchView>(body), total: body.total ?? 0 };
}

export async function addPunch(input: {
  userId: string;
  time: string;
  direction?: string;
  note: string;
}): Promise<PunchView> {
  const { data } = await apiClient.post<ApiResponse<PunchView>>(`${BASE}/punches/manual`, {
    userId: input.userId,
    time: input.time,
    direction: input.direction || undefined,
    note: input.note.trim(),
  });
  return unwrap(data, "Failed to add the punch");
}

export async function voidPunch(id: string, reason: string): Promise<PunchView> {
  const { data } = await apiClient.post<ApiResponse<PunchView>>(
    `${BASE}/punches/${encodeURIComponent(id)}/void`,
    { reason: reason.trim() },
  );
  return unwrap(data, "Failed to void the punch");
}

export async function importPunchesCsv(csv: string): Promise<IngestResult & { rows: number }> {
  const { data } = await apiClient.post<ApiResponse<IngestResult & { rows: number }>>(
    `${BASE}/import`,
    { csv },
  );
  return unwrap(data, "Failed to import");
}

export async function getUnmatchedCodes(): Promise<UnmatchedCodeView[]> {
  const { data } = await apiClient.get<ApiResponse<UnmatchedCodeView[]>>(`${BASE}/unmatched`);
  return readItems<UnmatchedCodeView>(unwrap(data, "Failed to load the unmatched codes"));
}

export async function getDevices(): Promise<DeviceView[]> {
  const { data } = await apiClient.get<ApiResponse<DeviceView[]>>(`${BASE}/devices`);
  return readItems<DeviceView>(unwrap(data, "Failed to load the devices"));
}

export async function getKeys(): Promise<KeyView[]> {
  const { data } = await apiClient.get<ApiResponse<KeyView[]>>(`${BASE}/keys`);
  return readItems<KeyView>(unwrap(data, "Failed to load the keys"));
}

export async function createKey(name: string): Promise<{ key: string; view: KeyView }> {
  const { data } = await apiClient.post<ApiResponse<{ key: string; view: KeyView }>>(
    `${BASE}/keys`,
    { name: name.trim() },
  );
  return unwrap(data, "Failed to make the key");
}

export async function revokeKey(id: string): Promise<void> {
  await apiClient.post(`${BASE}/keys/${encodeURIComponent(id)}/revoke`, {});
}

export async function getBiometricSettings(): Promise<BiometricSettingsView> {
  const { data } = await apiClient.get<ApiResponse<BiometricSettingsView>>(`${BASE}/settings`);
  return unwrap(data, "Failed to load the settings");
}

export async function patchBiometricSettings(
  patch: BiometricSettingsPatch,
): Promise<{ settings: BiometricSettingsView; changed: string[] }> {
  const { data } = await apiClient.patch<
    ApiResponse<{ settings: BiometricSettingsView; changed: string[] }>
  >(`${BASE}/settings`, patch);
  return unwrap(data, "Failed to save the settings");
}

export async function testPull(): Promise<PullRunResult> {
  const { data } = await apiClient.post<ApiResponse<PullRunResult>>(`${BASE}/pull/test`, {});
  return unwrap(data, "The test failed");
}

export async function runPull(): Promise<PullRunResult> {
  const { data } = await apiClient.post<ApiResponse<PullRunResult>>(`${BASE}/pull/run`, {});
  return unwrap(data, "The pull failed");
}
