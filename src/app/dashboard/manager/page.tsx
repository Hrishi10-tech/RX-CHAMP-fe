"use client";

import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/hooks/useSession";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { MembersSection } from "@/features/users/components/MembersSection";
import type { TeamMember } from "@/types";

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user, ready } = useSession();
  const managerId = user?.id;

  function openActivity(m: TeamMember) {
    router.push(`/dashboard/manager/activity/${m.id}?name=${encodeURIComponent(m.name)}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name ?? "Manager"}`}
        subtitle="Track your team's projects, tasks, and capacity."
      />

      <MembersSection
        managerId={managerId}
        pending={!ready}
        enabled={Boolean(managerId)}
        addMemberHref="/dashboard/manager/user"
        tableTitle="My team"
        emptyMessage="No team members assigned to you yet."
        onRowClick={openActivity}
      />
    </div>
  );
}
