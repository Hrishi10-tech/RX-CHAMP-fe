"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import { TeamTodayView } from "@/features/teamToday/components/TeamTodayView";

export default function TeamTodayPage() {
  const { role } = useSession();
  return <TeamTodayView isSuperAdmin={role === "SUPER_ADMIN"} />;
}
