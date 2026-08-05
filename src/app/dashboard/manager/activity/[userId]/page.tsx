"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { ProductivityDashboard } from "@/features/analytics/components/ProductivityDashboard";
import { useSession } from "@/features/auth/hooks/useSession";
import { ROLES } from "@/constants/roles";
import { LoadingOverlay } from "@/components/ui/Loader";

function UserActivity() {
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const { role } = useSession();
  const userId = params.userId;
  const name = searchParams.get("name") ?? undefined;

  const isManager = role === ROLES.MANAGER;
  const backHref = isManager ? "/dashboard/manager" : "/dashboard/admin/team-management";
  const backLabel = isManager ? "My Team" : "Team Management";

  return (
    <ProductivityDashboard
      userId={userId}
      userName={name}
      backHref={backHref}
      backLabel={backLabel}
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
