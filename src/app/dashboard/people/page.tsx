"use client";

import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useSession } from "@/features/auth/hooks/useSession";
import { MembersSection } from "@/features/users/components/MembersSection";
import { SuperManagersSection } from "@/features/users/components/SuperManagersSection";
import { seesEveryOrg } from "@/constants/roles";
import { useSelectedOrg } from "@/lib/org/selection";

/**
 * SPEC 7.2 Team management (Admin, Super Admin): people, their access and their
 * app. 3.3: the Super Manager too (Staff changes only), and on "All
 * organisations" everyone in every organisation; the Super Admin's platform view
 * also lists the Super Manager accounts.
 */
export default function PeoplePage() {
  const { role } = useSession();
  const org = useSelectedOrg();
  const combined = seesEveryOrg(role) && !org;
  const subtitle = combined
    ? "Everyone in every organisation. Pick an organisation in the header to add Staff."
    : role === "SUPER_MANAGER"
      ? "Everyone in the organisation. You add and edit Staff; Managers and admins are read-only."
      : "Everyone in the organisation: roles, departments, what managers can see, and the RX Vision app.";
  return (
    <div className="space-y-5">
      <PageHeader title="Team management" subtitle={subtitle} />
      <MembersSection />
      {role === "SUPER_ADMIN" && combined && <SuperManagersSection />}
    </div>
  );
}
