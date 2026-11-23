"use client";

import { Suspense } from "react";

import { LoadingOverlay } from "@/components/ui/Loader";
import { WfhPage } from "@/features/wfh/components/WfhPage";

export default function WfhRoute() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <WfhPage />
    </Suspense>
  );
}
