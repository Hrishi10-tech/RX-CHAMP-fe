"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useSession } from "@/features/auth/hooks/useSession";
import { MembersSection } from "@/features/users/components/MembersSection";
import { withReturnTo } from "@/lib/nav/returnTo";
import type { TeamMember } from "@/types";

export default function TeamManagementPage() {
  const router = useRouter();
  const { role, ready } = useSession();

  function openActivity(member: TeamMember) {
    router.push(
      withReturnTo(
        `/dashboard/manager/activity/${member.id}?name=${encodeURIComponent(member.name)}`,
        "/dashboard/admin/team-management",
        "Team Management",
      ),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management"
        subtitle="Everyone in the organization: roles, reporting lines and access."
      />

      <MembersSection
        // Everyone, every role: a Super Admin creates Managers and Staff here and
        // sets who reports to whom. The Role filter narrows it down.
        pending={!ready}
        enabled={role === "SUPER_ADMIN"}
        addMemberHref="/dashboard/admin/team-management/user"
        showCompanyFilter
        onRowClick={openActivity}
      />
    </div>
  );
}
