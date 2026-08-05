import {
  ArrowDownAZ,
  ArrowDownZA,
  CalendarArrowDown,
  CalendarArrowUp,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROLES } from "@/constants/roles";
import type { SelectOption } from "@/components/ui/types";
import type { MemberFilters, MemberSortKey, UserRoleFilter } from "@/features/users/types";

export const EMPTY_MEMBER_FILTERS: MemberFilters = {
  role: "",
  department: "",
  companyId: "",
  joinedFrom: "",
  joinedTo: "",
};

export const roleFilterOptions: SelectOption[] = [
  { value: ROLES.SUPER_ADMIN, label: "Super Admin" },
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.MANAGER, label: "Manager" },
  { value: ROLES.USER, label: "Member" },
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
  const { role, department, companyId, joinedFrom, joinedTo } = filters;
  // A from/to pair reads as one "Joined date" filter, matching the single field.
  return [role, department, companyId, joinedFrom || joinedTo].filter(Boolean).length;
}

/** Narrows the free-form filter value to what GetUsersParams.role accepts. */
export function asRoleFilter(role: string): UserRoleFilter | undefined {
  const match = roleFilterOptions.find((o) => o.value === role);
  return match ? (match.value as UserRoleFilter) : undefined;
}
