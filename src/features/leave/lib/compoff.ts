import { isApprover, normalizeRole, type Role } from "@/constants/roles";
import { dateKeyOf, formatDay } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";

/**
 * Comp off on 4.0: who decides, credits and is credited, as the API rules it
 * (backend compoff.service). Claims route like leave: the department's managers,
 * else the organisation admin. Every portal role may credit comp off by hand to
 * the people it sees; Staff never use the portal.
 */

/** Department managers, the organisation admin and the platform roles credit comp off by hand. */
export function canCreditCompOff(role: Role | null | undefined): boolean {
  return isApprover(role);
}

/**
 * Whether a person may be picked to look up or credit: never yourself (that is My
 * comp off), a Super Admin or the Super Manager (they belong to no organisation's
 * departments); a Manager only Staff of their departments (the people list is
 * already scoped to those).
 */
export function compOffPickable(
  role: Role | null | undefined,
  meId: string | null | undefined,
  person: { id: string; role?: string | null },
): boolean {
  if (!canCreditCompOff(role) || person.id === meId) return false;
  const theirs = normalizeRole(person.role);
  if (theirs === "SUPER_ADMIN" || theirs === "SUPER_MANAGER") return false;
  if (role === "MANAGER") return theirs === "USER" || theirs === null;
  return true;
}

/** "3 Nov, 4:05 PM" for an instant from the API, on the business clock. "" when missing. */
export function whenText(iso: string | null | undefined): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return `${formatDay(dateKeyOf(at))}, ${formatTime12(at)}`;
}

/** Which half of the Comp off tab opens: the claims when some wait on the caller. */
export function defaultCompOffPart(approver: boolean, needsMe: number): "mine" | "claims" {
  return approver && needsMe > 0 ? "claims" : "mine";
}

/**
 * Why the leave policy (comp off included) is read-only for the caller, or "" when
 * they may change it. 4.0: the organisation admin changes their organisation's
 * policy; a Super Admin picks the organisation first; the others read it.
 */
export function policyLockNote(
  role: Role | null | undefined,
  editable: boolean,
  allOrgs: boolean,
): string {
  if (editable) return "";
  if (role === "SUPER_ADMIN" && allOrgs) return "Pick an organisation to change its policy.";
  return "Only the organisation admin changes it.";
}
