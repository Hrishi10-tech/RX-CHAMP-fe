import type { TeamMember } from "@/types";

/**
 * Whether the viewer may change this member from Team management (SPEC 1.2):
 * an Admin changes the organisation's Managers and Staff; the Super Admin also
 * its Admin. Nobody changes their own account there (the API answers 403), and
 * nobody changes a Super Admin.
 */
export function canChangeMember(
  viewerRole: string | null | undefined,
  viewerId: string | null | undefined,
  member: Pick<TeamMember, "id" | "role">,
): boolean {
  if (viewerRole !== "SUPER_ADMIN" && viewerRole !== "ADMIN") return false;
  if (viewerId && String(member.id) === viewerId) return false;
  if (member.role === "SUPER_ADMIN") return false;
  return viewerRole === "SUPER_ADMIN" || member.role === "MANAGER" || member.role === "USER";
}
