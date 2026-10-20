"use client";

import { isOrgAdmin } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { ShiftsList } from "@/features/shifts/components/ShiftsList";

export default function ShiftsPage() {
  const { role } = useSession();
  // Admins and Super Admins edit shifts (SPEC 1.2); the route is theirs alone.
  return <ShiftsList canEdit={isOrgAdmin(role)} />;
}
