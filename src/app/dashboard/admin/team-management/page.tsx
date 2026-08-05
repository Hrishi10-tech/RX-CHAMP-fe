"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useSession } from "@/features/auth/hooks/useSession";
import { MembersSection } from "@/features/users/components/MembersSection";
import type { TeamMember } from "@/types";

export default function TeamManagementPage() {
  const router = useRouter();
  const { role, ready } = useSession();

  function openActivity(member: TeamMember) {
    router.push(`/dashboard/manager/activity/${member.id}?name=${encodeURIComponent(member.name)}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Team Management" subtitle="Manage teams, members, and role assignments." />

      <MembersSection
        // This screen lists managers unless a Role filter says otherwise.
        defaultRole="MANAGER"
        pending={!ready}
        enabled={role === "SUPER_ADMIN"}
        addMemberHref="/dashboard/admin/team-management/user"
        showCompanyFilter
        onRowClick={openActivity}
      />
    </div>
  );
}
