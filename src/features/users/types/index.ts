import type { ReactNode } from "react";

import type { PaginationMeta } from "@/lib/api";
import type { Grants } from "@/constants/roles";
import type { AgentStatus, TeamMember } from "@/types";

/** A department as the people endpoints name it. */
export interface UserDepartment {
  id: string;
  name: string;
  icon?: string | null;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  /**
   * 3.x sends the department's name here as text; 4.0 keeps it in step with
   * `departmentId` (SPEC 2.1). Some answers send `{ id, name, icon }` instead.
   */
  department?: string | UserDepartment | null;
  /** Staff: their one department (SPEC 2.1). */
  departmentId?: string | null;
  /** 4.0: the department behind `departmentId`, with its icon. */
  departmentRef?: UserDepartment | null;
  /** Managers: the departments they look after. */
  departmentIds?: string[];
  departments?: UserDepartment[];
  designation?: string | null;
  company?: string;
  companyId?: string;
  status?: string;
  /** Automatic screenshots for this user. Absent on an older API → treated as on. */
  screenshotsEnabled?: boolean;
  /** Input (away) tracking override: null follows the department (SPEC 2.5). */
  idleEnabled?: boolean | null;
  idleMinutes?: number | null;
  /** Managers' view grants (SPEC 2.2), nested or as flat columns. */
  grants?: Grants;
  grantScreenshots?: boolean;
  grantTimeline?: boolean;
  grantActivity?: boolean;
  /** Agent state. Absent on an older API → the row shows nothing rather than guessing. */
  agentStatus?: AgentStatus;
  agentLastSeenAt?: string | null;
  /** The shift override, or null when the person follows their department or the default. */
  shiftId?: string | null;
  createdAt?: string;
}

/** Roles a member list can filter by. */
export type UserRoleFilter = "ADMIN" | "MANAGER" | "USER";

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

export type MemberChange = "updated" | "deleted";

export interface UseMemberActionsOptions {
  /** Called after a successful edit, block/unblock or delete. */
  onChanged: (change: MemberChange) => void;
  /** Opens the edit form for a member (the page owns the form). */
  onEdit: (member: TeamMember) => void;
}

export interface UseMemberActionsResult {
  /** The row's button group — render inside the Actions column. */
  renderActions: (member: TeamMember) => ReactNode;
  /** Confirm dialogs — render once, outside the table. */
  dialogs: ReactNode;
}

/** SPEC 5.3 `GET /users` filters (Admin, Super Admin). */
export interface GetUsersParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: UserRoleFilter;
  departmentId?: string;
  status?: UserStatus;
  /** Not in the 4.0 spec; the 3.x server honours it and a 4.0 one may ignore it. */
  sort?: MemberSortKey;
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
  departmentId: string;
  status: string;
}

export interface MemberSortPopoverProps {
  value: MemberSortKey | null;
  onApply: (next: MemberSortKey | null) => void;
}

/** SPEC 5.3 `POST /users` (Admin, Super Admin). */
export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  /** At least 8 characters (the API refuses shorter ones). */
  password: string;
  role: "MANAGER" | "USER";
  designation?: string;
  /** Staff. */
  departmentId?: string;
  /** Managers: one or more. */
  departmentIds?: string[];
  shiftId?: string | null;
  grants?: Grants;
}

/** SPEC 5.3 `PATCH /users/:id`: the same fields, all optional, no password. */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  designation?: string;
  role?: "MANAGER" | "USER";
  departmentId?: string | null;
  departmentIds?: string[];
  shiftId?: string | null;
  grants?: Grants;
}

export interface UsersResult {
  users: User[];
  meta?: PaginationMeta;
}
