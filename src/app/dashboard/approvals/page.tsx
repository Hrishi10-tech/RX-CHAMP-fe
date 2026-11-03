"use client";

import { isOrgAdmin } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { ApprovalsView } from "@/features/approvals/components/ApprovalsView";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";

export default function ApprovalsPage() {
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
