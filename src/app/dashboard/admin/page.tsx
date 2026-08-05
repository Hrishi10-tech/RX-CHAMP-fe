"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";

export default function AdminDashboardPage() {
  const { user } = useSession();

  return (
    <PageHeader
      title={`Welcome back, ${user?.name ?? "Super Admin"}`}
      subtitle="Organization-wide overview and controls."
    />
  );
}
