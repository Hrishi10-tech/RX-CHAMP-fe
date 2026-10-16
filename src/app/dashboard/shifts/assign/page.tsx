"use client";

import { Suspense } from "react";

import { LoadingState } from "@/components/ui/StatePanel";
import { useSession } from "@/features/auth/hooks/useSession";
import { AssignShiftsView } from "@/features/shifts/components/AssignShiftsView";

function AssignShifts() {
  const { role } = useSession();
  // Department shifts are a Super Admin's; Managers override their own staff only.
  return <AssignShiftsView canEditDepartments={role === "SUPER_ADMIN"} />;
}

export default function AssignShiftsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AssignShifts />
    </Suspense>
  );
}
