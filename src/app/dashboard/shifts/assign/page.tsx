"use client";

import { Suspense } from "react";

import { LoadingState } from "@/components/ui/StatePanel";
import { isOrgAdmin } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { AssignShiftsView } from "@/features/shifts/components/AssignShiftsView";

function AssignShifts() {
  const { role } = useSession();
  // Department shifts and personal overrides: Admins and Super Admins (SPEC 1.2).
  // 3.3: the Super Manager assigns shifts as an Admin does.
  return <AssignShiftsView canEditDepartments={isOrgAdmin(role) || role === "SUPER_MANAGER"} />;
}

export default function AssignShiftsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AssignShifts />
    </Suspense>
  );
}
