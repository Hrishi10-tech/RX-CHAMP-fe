"use client";

import { isOrgAdmin } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { ReportsHome } from "@/features/reports/components/ReportsHome";

export default function ReportsPage() {
  const { role } = useSession();
  return <ReportsHome isSuperAdmin={isOrgAdmin(role)} />;
}
