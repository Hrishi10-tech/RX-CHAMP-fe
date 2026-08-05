"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import { ProductivityDashboard } from "@/features/analytics/components/ProductivityDashboard";
import { LoadingOverlay } from "@/components/ui/Loader";

export default function MyDashboardPage() {
  const { user, ready } = useSession();

  if (!ready) return <LoadingOverlay label="Loading…" />;

  return <ProductivityDashboard userId={user?.id ?? "me"} userName={user?.name} />;
}
