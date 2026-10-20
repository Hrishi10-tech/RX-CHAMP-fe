import type { LucideIcon } from "lucide-react";

import type { Status } from "@/components/ui/StatusBadge";
import type { Grants } from "@/constants/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface MemberDepartment {
  id: string;
  name: string;
  icon: string;
}

/** One row of the Team management table. */
export interface TeamMember {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  /** The stored role: SUPER_ADMIN, ADMIN, MANAGER or USER. */
  role: string;
  designation: string;
  /** Staff: their department; a manager's first. */
  department: MemberDepartment | null;
  /** Managers: every department they look after (staff: theirs alone). */
  departments: MemberDepartment[];
  status: Status;
  /** Whether the agent takes automatic screenshots for this member. */
  screenshotsEnabled: boolean;
  /** Input (away) tracking override; null follows the department (SPEC 2.5). */
  idleEnabled: boolean | null;
  idleMinutes: number | null;
  /** Managers' view grants (SPEC 2.2). */
  grants: Grants;
  shiftId: string | null;
  /**
   * Whether their agent is set up and reporting — separate from `status`, which is
   * only whether the account may sign in.
   */
  agentStatus: AgentStatus;
  /** Last activity report, for the "quiet since" tooltip. */
  agentLastSeenAt: string | null;
  joined: string;
}

/**
 * Each value calls for a different response, which is the point of the column:
 *   LIVE          reporting now — nothing to do.
 *   DAY_ENDED     ended their day; the silence is expected.
 *   NOT_SIGNED_IN no usable session — they must sign in again.
 *   OFFLINE       should be recording and isn't — the one worth chasing.
 *   NOT_ACTIVATED never installed. One-way: nobody returns to it.
 */
export type AgentStatus = "LIVE" | "DAY_ENDED" | "OFFLINE" | "NOT_SIGNED_IN" | "NOT_ACTIVATED";
