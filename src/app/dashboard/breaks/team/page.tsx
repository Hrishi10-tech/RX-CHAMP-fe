"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import { TeamBreaksView } from "@/features/breaks/components/TeamBreaksView";

export default function TeamBreaksPage() {
  const { role } = useSession();
  return <TeamBreaksView isSuperAdmin={role === "SUPER_ADMIN"} />;
}
