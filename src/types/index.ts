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
  joined: string;
}
