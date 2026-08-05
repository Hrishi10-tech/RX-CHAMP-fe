import type { ReactNode } from "react";

import type { PaginationMeta } from "@/lib/api";
import type { SelectOption } from "@/components/ui/types";
import type { TeamMember } from "@/types";

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  designation?: string;
  company?: string;
  companyId?: string;
  managerId?: string;
  status?: string;
  shiftId?: string;
  shiftStart?: string;
  shiftEnd?: string;
  createdAt?: string;
}

export type UserRoleFilter = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "USER";

export type UserStatus = "ACTIVE" | "DISABLED";

/** A pending block/unblock awaiting confirmation. */
export interface MemberStatusTarget {
  member: TeamMember;
  /** true = currently active, about to be blocked. */
  block: boolean;
}

export interface MembersSectionProps {
  /** Scopes the list to one manager's reports. Omit to list across the company. */
  managerId?: string;
  /** Role queried when no Role filter is applied. */
  defaultRole?: UserRoleFilter;
  /** True while the caller is still resolving session data — keeps the loader up. */
  pending?: boolean;
  /** False when the caller knows there is nothing to fetch (e.g. wrong role). */
  enabled?: boolean;
  addMemberHref: string;
  /** Shown above the table, with the total appended. */
  tableTitle?: string;
  emptyMessage?: string;
  /**
   * The Company filter needs the companies endpoint, which is admin-only — leave
   * this off for manager-scoped views.
   */
  showCompanyFilter?: boolean;
  onRowClick?: (member: TeamMember) => void;
}

export type MemberChange = "updated" | "deleted";

export interface UseMemberActionsOptions {
  /** Called after a successful edit, block/unblock or delete. */
  onChanged: (change: MemberChange) => void;
}

export interface UseMemberActionsResult {
  /** The row's button group — render inside the Actions column. */
  renderActions: (member: TeamMember) => ReactNode;
  /** Edit modal and confirm dialogs — render once, outside the table. */
  dialogs: ReactNode;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRoleFilter;
  managerId?: string;
  companyId?: string;

  /** Omitted for the server's default order (joined_desc). */
  sort?: MemberSortKey;

  // Filter params below are NOT confirmed against the backend yet — these are the
  // names the UI sends. getUsers() drops empty values, so nothing is sent until a
  // filter is applied. Rename here once the real query contract lands.
  department?: string;
  joinedFrom?: string;
  joinedTo?: string;
}

/** Sort tokens accepted by GET /users?sort= — also identifies the popover row. */
export type MemberSortKey =
  | "name_asc"
  | "name_desc"
  | "joined_desc"
  | "joined_asc"
  | "role_asc"
  | "role_desc";

export interface MemberFilters {
  role: string;
  department: string;
  companyId: string;
  joinedFrom: string;
  joinedTo: string;
}

export interface MemberFiltersModalProps {
  value: MemberFilters;
  onApply: (next: MemberFilters) => void;
  companyOptions: SelectOption[];
  companiesLoading?: boolean;
  /** Hidden where the companies endpoint isn't available (manager-scoped views). */
  showCompanyFilter?: boolean;
}

export interface MemberSortPopoverProps {
  value: MemberSortKey | null;
  onApply: (next: MemberSortKey | null) => void;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  companyId?: string;
  department?: string;
  designation?: string;
  shiftStart?: string;
  shiftEnd?: string;
}

/**
 * Server's UpdateUserDto covers firstName, lastName, department and designation.
 *
 * email is sent by the edit form but is NOT in the DTO yet — the server drops it,
 * so callers must verify it round-tripped rather than assume success. Remove this
 * note once UpdateUserDto/UpdateUserUseCase handle it.
 *
 * Still unsupported: role, managerId, companyId and shift have no update route;
 * status has its own (POST /users/:id/status); password has none at all.
 */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  department?: string;
  designation?: string;
  email?: string;
}

export interface UsersResult {
  users: User[];
  meta?: PaginationMeta;
}

export interface EditMemberModalProps {
  open: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onSaved?: () => void;
}
