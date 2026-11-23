"use client";

import { Suspense } from "react";

import { LoadingOverlay } from "@/components/ui/Loader";
import { AttendancePage } from "@/features/attendance/components/AttendancePage";

export default function AttendanceRoute() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <AttendancePage />
    </Suspense>
  );
}
