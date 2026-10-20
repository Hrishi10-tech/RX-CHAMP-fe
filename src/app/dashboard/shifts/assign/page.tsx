"use client";

import { Suspense } from "react";

import { LoadingState } from "@/components/ui/StatePanel";
import { isOrgAdmin } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { AssignShiftsView } from "@/features/shifts/components/AssignShiftsView";

function AssignShifts() {
  const { role } = useSession();
  // Department shifts and personal overrides: Admins and Super Admins (SPEC 1.2).
  return <AssignShiftsView canEditDepartments={isOrgAdmin(role)} />;
}

export default function AssignShiftsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AssignShifts />
    </Suspense>
  );
}
