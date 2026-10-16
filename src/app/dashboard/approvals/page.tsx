"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import { ApprovalsView } from "@/features/approvals/components/ApprovalsView";

export default function ApprovalsPage() {
  const { role, user } = useSession();
  return (
    <ApprovalsView isSuperAdmin={role === "SUPER_ADMIN"} myId={user?.id} myName={user?.name} />
  );
}
