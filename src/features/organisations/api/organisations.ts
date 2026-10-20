import { apiClient, type ApiResponse } from "@/lib/api";
import { readItems, unwrap } from "@/lib/api/list";
import type {
  CreateAdminInput,
  OrganisationView,
  PlatformOverview,
} from "@/features/organisations/types";

/**
 * SPEC 5.1 (Super Admin only; never sent with X-Org-Id in mind):
 *   GET    /organisations
 *   POST   /organisations {name}
 *   PATCH  /organisations/:id {name}
 *   DELETE /organisations/:id                   409 ORG_NOT_EMPTY
 *   POST   /organisations/:id/admin {firstName, lastName, email, password}   409 ADMIN_EXISTS
 *   GET    /overview/platform
 */
const BASE = "/api/v1/organisations";

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function readOrganisation(raw: unknown): OrganisationView | null {
  const r = rec(raw);
  if (typeof r.id !== "string") return null;
  const admin = rec(r.admin);
  const counts = rec(r.counts);
  const today = rec(r.today);
  return {
    id: r.id,
    name: typeof r.name === "string" ? r.name : "",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : null,
    admin:
      typeof admin.id === "string"
        ? {
            id: admin.id,
            name: typeof admin.name === "string" ? admin.name : "",
            email: typeof admin.email === "string" ? admin.email : "",
          }
        : null,
    counts: {
      staff: num(counts.staff),
      managers: num(counts.managers),
      departments: num(counts.departments),
    },
    today: {
      started: num(today.started),
      working: num(today.working),
      onBreak: num(today.onBreak),
      notStarted: num(today.notStarted),
    },
  };
}

function readList(data: unknown): OrganisationView[] {
  return readItems<unknown>(data)
    .map(readOrganisation)
    .filter((o): o is OrganisationView => o !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOrganisations(): Promise<OrganisationView[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(BASE);
  if (!data?.success) throw new Error(data?.message ?? "Failed to load organisations");
  return readList(data.data);
}

export async function createOrganisation(name: string): Promise<OrganisationView> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(BASE, { name });
  const org = readOrganisation(unwrap(data, "Failed to create the organisation"));
  if (!org) throw new Error("Failed to create the organisation");
  return org;
}

export async function renameOrganisation(id: string, name: string): Promise<void> {
  const { data } = await apiClient.patch<ApiResponse<unknown>>(
    `${BASE}/${encodeURIComponent(id)}`,
    { name },
  );
  if (!data?.success) throw new Error(data?.message ?? "Failed to rename the organisation");
}

export async function deleteOrganisation(id: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!data?.success) throw new Error(data?.message ?? "Failed to delete the organisation");
}

export async function createOrganisationAdmin(id: string, input: CreateAdminInput): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    `${BASE}/${encodeURIComponent(id)}/admin`,
    input,
  );
  if (!data?.success) throw new Error(data?.message ?? "Failed to create the admin");
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/overview/platform");
  const body = rec(unwrap(data, "Failed to load the platform overview"));
  return {
    organisations: readList(body.organisations),
    unassignedPeople: num(body.unassignedPeople),
  };
}
