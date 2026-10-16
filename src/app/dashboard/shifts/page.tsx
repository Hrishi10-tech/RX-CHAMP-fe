"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import { ShiftsList } from "@/features/shifts/components/ShiftsList";

export default function ShiftsPage() {
  const { role } = useSession();
  // Managers read shifts (to override their staff's); only a Super Admin edits them.
  return <ShiftsList canEdit={role === "SUPER_ADMIN"} />;
}
