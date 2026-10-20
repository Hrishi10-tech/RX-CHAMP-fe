import {
  ArrowDownAZ,
  ArrowDownZA,
  CalendarArrowDown,
  CalendarArrowUp,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROLES, ROLE_LABEL } from "@/constants/roles";
import type { SelectOption } from "@/components/ui/types";
import type {
  MemberFilters,
  MemberSortKey,
  UserRoleFilter,
  UserStatus,
} from "@/features/users/types";

/** A filter's "no filter" value (Radix Select needs a non-empty one). */
export const ANY = "__any__";

export const EMPTY_MEMBER_FILTERS: MemberFilters = {
  role: ANY,
  departmentId: ANY,
  status: ANY,
};

/** The people an organisation's members list holds (SPEC 1.1). */
export const roleFilterOptions: SelectOption[] = [
  { value: ANY, label: "All roles" },
  { value: ROLES.ADMIN, label: ROLE_LABEL.ADMIN },
  { value: ROLES.MANAGER, label: ROLE_LABEL.MANAGER },
  { value: ROLES.USER, label: ROLE_LABEL.USER },
];

export const statusFilterOptions: SelectOption[] = [
  { value: ANY, label: "Any status" },
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Blocked" },
];

/** Keys are the tokens GET /users?sort= accepts, so they're sent through as-is. */
export const SORT_OPTIONS: {
  key: MemberSortKey;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "name_asc", label: "Name (A – Z)", icon: ArrowDownAZ },
  { key: "name_desc", label: "Name (Z – A)", icon: ArrowDownZA },
  { key: "joined_desc", label: "Joined Date (Newest)", icon: CalendarArrowDown },
  { key: "joined_asc", label: "Joined Date (Oldest)", icon: CalendarArrowUp },
  { key: "role_asc", label: "Role (A – Z)", icon: UserRound },
  { key: "role_desc", label: "Role (Z – A)", icon: UserRound },
];

export function countActiveFilters(filters: MemberFilters): number {
  return [filters.role, filters.departmentId, filters.status].filter((v) => v && v !== ANY).length;
}

/** A department filter's id, or undefined for every department. */
export function asDepartmentFilter(value: string): string | undefined {
  return value && value !== ANY ? value : undefined;
}

/** Narrows the free-form filter value to what GetUsersParams.role accepts. */
export function asRoleFilter(role: string): UserRoleFilter | undefined {
  return role === "ADMIN" || role === "MANAGER" || role === "USER" ? role : undefined;
}

export function asStatusFilter(status: string): UserStatus | undefined {
  return status === "ACTIVE" || status === "DISABLED" ? status : undefined;
}
