"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { ProductivityDashboard } from "@/features/analytics/components/ProductivityDashboard";
import { useSession } from "@/features/auth/hooks/useSession";
import { ROLES } from "@/constants/roles";
import { LoadingOverlay } from "@/components/ui/Loader";
import { resolveReturnTo } from "@/lib/nav/returnTo";

function UserActivity() {
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const { role } = useSession();
  const userId = params.userId;
  const name = searchParams.get("name") ?? undefined;

  // Reachable from Team Management, a manager's own team, and the org → manager
  // drill-down, so the way back has to come from whoever sent us here. The
  // role-based pair is only the fallback for arriving fresh — a reload or a
  // bookmark — where there is nothing to go back to.
  const isManager = role === ROLES.MANAGER;
  const back = resolveReturnTo(searchParams, {
    href: isManager ? "/dashboard/manager" : "/dashboard/admin/team-management",
    label: isManager ? "My Team" : "Team Management",
  });

  return (
    <ProductivityDashboard
      userId={userId}
      userName={name}
      backHref={back.href}
      backLabel={back.label}
    />
  );
}

export default function UserActivityPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <UserActivity />
    </Suspense>
  );
}
