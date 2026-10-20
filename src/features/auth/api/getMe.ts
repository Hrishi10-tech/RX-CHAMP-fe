import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import { NO_GRANTS, normalizeRole, type Grants } from "@/constants/roles";
import type { DepartmentRef, MePermissions, MeView, OrganisationRef } from "@/features/auth/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function readDepartmentRef(value: unknown): DepartmentRef | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  if (!id) return null;
  return { id, name: str(value.name), icon: typeof value.icon === "string" ? value.icon : null };
}

function readOrganisation(value: unknown): OrganisationRef | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  return id ? { id, name: str(value.name) } : null;
}

/** Grants as `{screenshots, timeline, activity}`, or the flat `grantScreenshots` columns. */
export function readGrants(value: unknown, flat?: Record<string, unknown>): Grants {
  if (isRecord(value)) {
    return {
      screenshots: value.screenshots === true,
      timeline: value.timeline === true,
      activity: value.activity === true,
    };
  }
  if (flat) {
    return {
      screenshots: flat.grantScreenshots === true,
      timeline: flat.grantTimeline === true,
      activity: flat.grantActivity === true,
    };
  }
  return { ...NO_GRANTS };
}

const PERMISSION_KEYS: (keyof MePermissions)[] = [
  "canManageOrganisations",
  "canManageOrg",
  "canManagePeople",
  "canManageDepartments",
  "canManageShifts",
  "canSeeTeam",
  "canSeeScreenshots",
  "canSeeTimeline",
  "canSeeActivity",
  "canApprove",
  "canSeeReports",
  "canSeeTeamBreaks",
  "canUseMessages",
  "canUsePortal",
  "needsOrganisation",
];

/** `permissions` as booleans (a missing key is false), or null when the API sent none. */
export function readPermissions(value: unknown): MePermissions | null {
  if (!isRecord(value)) return null;
  const out = {} as MePermissions;
  for (const key of PERMISSION_KEYS) out[key] = value[key] === true;
  return out;
}

/**
 * Whether the server says the portal is not for this person: Staff, or anyone
 * whose `permissions.canUsePortal` is false (SPEC 1.1).
 */
export function portalRefused(
  me: Pick<MeView, "role" | "permissions"> | null | undefined,
): boolean {
  if (!me) return false;
  return me.role === "USER" || me.permissions?.canUsePortal === false;
}

/** Reads the `/me` answer defensively: a missing list is empty, never undefined. */
export function readMe(raw: unknown): MeView {
  if (!isRecord(raw)) throw new Error("GET /me answered without a person");
  const role = normalizeRole(str(raw.role));
  if (!role) throw new Error(`Unknown role "${str(raw.role)}"`);
  const departments = Array.isArray(raw.departments)
    ? raw.departments.map(readDepartmentRef).filter((d): d is DepartmentRef => d !== null)
    : [];
  return {
    id: str(raw.id),
    name: str(raw.name) || str(raw.email),
    email: str(raw.email),
    role,
    organisation: readOrganisation(raw.organisation),
    department: readDepartmentRef(raw.department),
    departments,
    grants: readGrants(raw.grants, raw),
    permissions: readPermissions(raw.permissions),
  };
}

/** `GET /me` (SPEC 5.3): the portal's source of truth for role, organisation and grants. */
export async function getMe(): Promise<MeView> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/me");
  return readMe(unwrap(data, "Couldn't read who is signed in"));
}
