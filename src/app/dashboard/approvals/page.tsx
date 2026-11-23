"use client";

import { Suspense } from "react";

import { LoadingOverlay } from "@/components/ui/Loader";
import { isOrgAdmin } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { ApprovalsView } from "@/features/approvals/components/ApprovalsView";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";

function Approvals() {
  const { role, user } = useSession();
  const { mixed } = useOrgsInView();
  return (
    <ApprovalsView
      isSuperAdmin={isOrgAdmin(role)}
      isSuperManager={role === "SUPER_MANAGER"}
      mixed={mixed}
      myId={user?.id}
      myName={user?.name}
    />
  );
}

export default function ApprovalsPage() {
  // The view reads its tab, scope and month from the address (links from the
  // payroll lock), which needs a Suspense boundary.
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <Approvals />
    </Suspense>
  );
}
