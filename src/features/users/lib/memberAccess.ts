import type { TeamMember } from "@/types";

/**
 * Whether the viewer may change this member from Team management (SPEC 1.2):
 * an Admin changes the organisation's Managers and Staff; the Super Admin also
 * its Admin and the Super Manager accounts (3.3); the Super Manager changes
 * Staff only. Nobody changes their own account there (the API answers 403), and
 * nobody changes a Super Admin.
 */
export function canChangeMember(
  viewerRole: string | null | undefined,
  viewerId: string | null | undefined,
  member: Pick<TeamMember, "id" | "role">,
): boolean {
  if (viewerRole !== "SUPER_ADMIN" && viewerRole !== "ADMIN" && viewerRole !== "SUPER_MANAGER") {
    return false;
  }
  if (viewerId && String(member.id) === viewerId) return false;
  if (member.role === "SUPER_ADMIN") return false;
  if (viewerRole === "SUPER_ADMIN") return true;
  if (viewerRole === "SUPER_MANAGER") return member.role === "USER";
  return member.role === "MANAGER" || member.role === "USER";
}

/** The server's reason (3.3) for a row the Super Manager may read but not change. */
export const SUPER_MANAGER_READ_ONLY =
  "The Super Manager changes Staff only; Managers and admins are read-only.";

/** Why a row offers no changes, for its tooltip; null when it is the viewer's own. */
export function readOnlyReason(
  viewerRole: string | null | undefined,
  viewerId: string | null | undefined,
  member: Pick<TeamMember, "id" | "role">,
): string | null {
  if (viewerId && String(member.id) === viewerId) return null;
  if (viewerRole === "SUPER_MANAGER") return SUPER_MANAGER_READ_ONLY;
  return "Only the organisation admin can change people.";
}
