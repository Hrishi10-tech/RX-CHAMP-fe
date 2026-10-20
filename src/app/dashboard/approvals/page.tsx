"use client";

import { isOrgAdmin } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { ApprovalsView } from "@/features/approvals/components/ApprovalsView";

export default function ApprovalsPage() {
  const { role, user } = useSession();
  return <ApprovalsView isSuperAdmin={isOrgAdmin(role)} myId={user?.id} myName={user?.name} />;
}
