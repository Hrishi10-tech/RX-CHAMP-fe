import type { ReactNode } from "react";

import type { PaginationMeta } from "@/lib/api";
import type { SelectOption } from "@/components/ui/types";
import type { AgentStatus, TeamMember } from "@/types";

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  /** null when not set (the API sends null, not an absent field). */
  department?: string | null;
  designation?: string | null;
  company?: string;
  companyId?: string;
  /** null for someone who reports to nobody (a Super Admin). */
  managerId?: string | null;
  status?: string;
  /** Automatic screenshots for this user. Absent on an older API → treated as on. */
  screenshotsEnabled?: boolean;
  /** Agent state. Absent on an older API → the row shows nothing rather than guessing. */
  agentStatus?: AgentStatus;
  agentLastSeenAt?: string | null;
  /** The shift override, or null when the person follows their department or the default. */
  shiftId?: string | null;
  shiftStart?: string;
  shiftEnd?: string;
  createdAt?: string;
}

export type UserRoleFilter = "SUPER_ADMIN" | "MANAGER" | "USER";

export type UserStatus = "ACTIVE" | "DISABLED";

/** A pending block/unblock awaiting confirmation. */
export interface MemberStatusTarget {
  member: TeamMember;
  /** true = currently active, about to be blocked. */
  block: boolean;
}

/** A pending screenshots on/off change awaiting confirmation. */
export interface MemberScreenshotsTarget {
  member: TeamMember;
  /** The value being moved to — true = about to be switched on. */
  enable: boolean;
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

  // The filter panel's fields. All of them combine with each other and with
  // `search`; getUsers() drops empty values, so nothing is sent until a filter is
  // applied. Team is an exact match, and the joined dates are inclusive whole days.
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
  /** At least 8 characters (the API refuses shorter ones). */
  password: string;
  role: string;
  /** Super Admin only: who the new person reports to (defaults to the creator). */
  managerId?: string;
  companyId?: string;
  department?: string;
  designation?: string;
  shiftStart?: string;
  shiftEnd?: string;
}

/**
 * The server's UpdateUserDto. A Manager may change their own staff's name, email,
 * designation and department; only a Super Admin may change `role` or `managerId`
 * (who they report to; "" clears it). Company and shift have no update route here
 * (shifts are assigned under Assign shifts); status and password have their own.
 */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  department?: string;
  designation?: string;
  email?: string;
  role?: "SUPER_ADMIN" | "MANAGER" | "USER";
  managerId?: string;
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
