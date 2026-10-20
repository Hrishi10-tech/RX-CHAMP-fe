import { apiClient, type ApiResponse } from "@/lib/api";
import { readItems, unwrap } from "@/lib/api/list";
import { DEFAULT_DEPARTMENT_ICON } from "@/features/departments/lib/icons";
import type { DepartmentInput, DepartmentView } from "@/features/departments/types";

/**
 * SPEC 5.2:
 *   GET    /departments              Admin, SA, Manager (their departments)
 *   POST   /departments {name, icon}  409 DEPARTMENT_EXISTS
 *   PATCH  /departments/:id {name?, icon?}
 *   DELETE /departments/:id           409 DEPARTMENT_NOT_EMPTY
 */
const BASE = "/api/v1/departments";

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function readDepartment(raw: unknown): DepartmentView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const idle = (r.idle && typeof r.idle === "object" ? r.idle : {}) as Record<string, unknown>;
  return {
    id: r.id,
    name: typeof r.name === "string" ? r.name : "",
    icon: typeof r.icon === "string" && r.icon ? r.icon : DEFAULT_DEPARTMENT_ICON,
    staffCount: num(r.staffCount),
    managers: Array.isArray(r.managers)
      ? (r.managers as { id?: unknown; name?: unknown }[])
          .filter((m) => typeof m?.id === "string")
          .map((m) => ({ id: m.id as string, name: typeof m.name === "string" ? m.name : "" }))
      : [],
    idle: {
      enabled: typeof idle.enabled === "boolean" ? idle.enabled : null,
      minutes: typeof idle.minutes === "number" ? idle.minutes : null,
      reasonKeys: Array.isArray(idle.reasonKeys)
        ? idle.reasonKeys.filter((k): k is string => typeof k === "string")
        : null,
    },
  };
}

export async function getDepartments(): Promise<DepartmentView[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(BASE);
  if (!data?.success) throw new Error(data?.message ?? "Failed to load departments");
  return readItems<unknown>(data.data)
    .map(readDepartment)
    .filter((d): d is DepartmentView => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createDepartment(input: DepartmentInput): Promise<DepartmentView> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(BASE, input);
  const dept = readDepartment(unwrap(data, "Failed to create the department"));
  if (!dept) throw new Error("Failed to create the department");
  return dept;
}

export async function updateDepartment(
  id: string,
  input: Partial<DepartmentInput>,
): Promise<DepartmentView> {
  const { data } = await apiClient.patch<ApiResponse<unknown>>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  const dept = readDepartment(unwrap(data, "Failed to save the department"));
  if (!dept) throw new Error("Failed to save the department");
  return dept;
}

export async function deleteDepartment(id: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!data?.success) throw new Error(data?.message ?? "Failed to delete the department");
}
