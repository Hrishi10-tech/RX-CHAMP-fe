"use client";

import { Suspense } from "react";

import { LoadingOverlay } from "@/components/ui/Loader";
import { LeavePage } from "@/features/leave/components/LeavePage";

export default function LeaveRoute() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <LeavePage />
    </Suspense>
  );
}
