import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import { IDLE_MINUTES, withBuiltIns } from "@/features/tracking/lib/reasons";
import type { DepartmentIdleSetting, IdleReason, IdleSettings } from "@/features/tracking/types";

/**
 * SPEC 5.5 (Admin, Super Admin):
 *   GET /idle-settings
 *   PUT /idle-settings {defaultEnabled, defaultMinutes, reasons}
 *   PUT /idle-settings/departments/:id {enabled, minutes, reasonKeys}   (each nullable)
 */
const BASE = "/api/v1/idle-settings";

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function readIdleSettings(raw: unknown): IdleSettings {
  const r = rec(raw);
  const reasons: IdleReason[] = (Array.isArray(r.reasons) ? r.reasons : [])
    .map(rec)
    .filter((x) => typeof x.key === "string")
    .map((x) => ({
      key: x.key as string,
      label: typeof x.label === "string" ? x.label : "",
      kind: typeof x.kind === "string" ? x.kind : "CUSTOM",
      builtIn: x.builtIn === true,
    }));
  const departments: DepartmentIdleSetting[] = (Array.isArray(r.departments) ? r.departments : [])
    .map(rec)
    .filter((d) => typeof d.departmentId === "string")
    .map((d) => ({
      departmentId: d.departmentId as string,
      enabled: typeof d.enabled === "boolean" ? d.enabled : null,
      minutes: typeof d.minutes === "number" ? d.minutes : null,
      reasonKeys: Array.isArray(d.reasonKeys)
        ? d.reasonKeys.filter((k): k is string => typeof k === "string")
        : null,
    }));
  return {
    defaultEnabled: r.defaultEnabled === true,
    defaultMinutes: typeof r.defaultMinutes === "number" ? r.defaultMinutes : IDLE_MINUTES.default,
    reasons: withBuiltIns(reasons),
    departments,
  };
}

export async function getIdleSettings(): Promise<IdleSettings> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(BASE);
  return readIdleSettings(unwrap(data, "Couldn't load input tracking"));
}

export async function saveIdleDefaults(input: {
  defaultEnabled: boolean;
  defaultMinutes: number;
  reasons: IdleReason[];
}): Promise<IdleSettings> {
  const { data } = await apiClient.put<ApiResponse<unknown>>(BASE, {
    defaultEnabled: input.defaultEnabled,
    defaultMinutes: input.defaultMinutes,
    reasons: input.reasons.map((r) => ({
      key: r.key,
      label: r.label.trim(),
      kind: r.builtIn ? r.kind : "CUSTOM",
    })),
  });
  return readIdleSettings(unwrap(data, "Couldn't save input tracking"));
}

export async function saveDepartmentIdle(
  departmentId: string,
  setting: Omit<DepartmentIdleSetting, "departmentId">,
): Promise<IdleSettings> {
  const { data } = await apiClient.put<ApiResponse<unknown>>(
    `${BASE}/departments/${encodeURIComponent(departmentId)}`,
    setting,
  );
  return readIdleSettings(unwrap(data, "Couldn't save the department"));
}
