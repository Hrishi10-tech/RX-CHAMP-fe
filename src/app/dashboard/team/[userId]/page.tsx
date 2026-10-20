"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { ProductivityDashboard } from "@/features/analytics/components/ProductivityDashboard";
import { useSession } from "@/features/auth/hooks/useSession";
import { isOrgAdmin } from "@/constants/roles";
import { LoadingState } from "@/components/ui/StatePanel";
import { resolveReturnTo } from "@/lib/nav/returnTo";

function TeamMember() {
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const { grants, role } = useSession();
  const back = resolveReturnTo(searchParams, { href: "/dashboard/team", label: "Team" });

  return (
    <ProductivityDashboard
      // A new person is a new page: nothing from the last one carries over.
      key={params.userId}
      userId={params.userId}
      userName={searchParams.get("name") ?? undefined}
      backHref={back.href}
      backLabel={back.label}
      grants={grants}
      // Capture now is the Admin's; a manager's screenshots grant is view-only.
      canCapture={isOrgAdmin(role)}
    />
  );
}

/** A person's day: the productivity dashboard, only the sections the viewer may see. */
export default function TeamMemberPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <TeamMember />
    </Suspense>
  );
}
