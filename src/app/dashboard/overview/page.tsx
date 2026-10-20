"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import { OverviewView } from "@/features/overview/components/OverviewView";
import { PlatformOverview } from "@/features/organisations/components/PlatformOverview";
import { useSelectedOrg } from "@/lib/org/selection";

/**
 * SPEC 7.2 Overview: the organisation's live picture for an Admin or a Manager
 * (their departments), and for a Super Admin inside an organisation; the
 * platform overview for a Super Admin on "All organisations".
 */
export default function OverviewPage() {
  const { role } = useSession();
  const org = useSelectedOrg();
  if (role === "SUPER_ADMIN" && !org) return <PlatformOverview />;
  return <OverviewView />;
}
