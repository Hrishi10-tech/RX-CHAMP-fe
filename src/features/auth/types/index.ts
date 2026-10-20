import type { Grants, Role } from "@/constants/roles";

export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  /**
   * A manager's view grants, copied from GET /me into the session cookie so the
   * middleware can keep a manager without grants off the Team page. The pages
   * themselves read them from GET /me.
   */
  grants?: Grants;
}

export interface LoginData {
  user: AuthUser;
}

export type LoginFailureReason =
  | "invalid_credentials"
  | "account_blocked"
  /** 429: too many wrong passwords for this account, or too many sign-ins from this network. */
  | "rate_limited"
  /** A Staff account: the portal is not for them (SPEC 1.1). */
  | "staff"
  | "network"
  | "server"
  | "unknown";

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: LoginFailureReason; message?: string };

/** A department as GET /me and the people endpoints name it. */
export interface DepartmentRef {
  id: string;
  name: string;
  icon?: string | null;
}

export interface OrganisationRef {
  id: string;
  name: string;
}

/** SPEC 5.3 `GET /me`: who is signed in, where, and what they may see. */
export interface MeView {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** null for a Super Admin (the platform). */
  organisation: OrganisationRef | null;
  /** Staff: their department. */
  department: DepartmentRef | null;
  /** Managers: the departments they look after. */
  departments: DepartmentRef[];
  grants: Grants;
  /**
   * The menus the server says this person may use (SPEC 1.2, 7.1), or null when
   * an older API leaves them out. `canUsePortal: false` means the portal is not
   * for them (Staff), whatever the role reads.
   */
  permissions: MePermissions | null;
}

/** `GET /me` → `permissions`. */
export interface MePermissions {
  canManageOrganisations: boolean;
  canManageOrg: boolean;
  canManagePeople: boolean;
  canManageDepartments: boolean;
  canManageShifts: boolean;
  canSeeTeam: boolean;
  canSeeScreenshots: boolean;
  canSeeTimeline: boolean;
  canSeeActivity: boolean;
  canApprove: boolean;
  canSeeReports: boolean;
  canSeeTeamBreaks: boolean;
  canUseMessages: boolean;
  canUsePortal: boolean;
  needsOrganisation: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  role: Role | null;
  ready: boolean;
  /** GET /me, once it has answered for this session. */
  me: MeView | null;
}

export interface UseSessionResult {
  user: AuthUser | null;
  role: Role | null;
  ready: boolean;
  me: MeView | null;
  /** The viewer's grants: everything for Admins, the manager's own, nothing for others. */
  grants: Grants;
  logout: () => void;
}
