import type { LucideIcon } from "lucide-react";

import type { Status } from "@/app/dashboard/admin/team-management/companies";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface TeamMember {
  id: string | number;
  name: string;
  email: string;
  role: string;
  team: string;
  company: string;
  status: Status;
  /** Whether the agent takes automatic screenshots for this member. */
  screenshotsEnabled: boolean;
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
