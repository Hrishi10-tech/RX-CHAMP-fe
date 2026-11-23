"use client";

import { Suspense } from "react";

import { LoadingOverlay } from "@/components/ui/Loader";
import { SettingsView } from "@/features/settings/components/SettingsView";

/** Super Admin only (the route guard and the API both check). */
export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <SettingsView />
    </Suspense>
  );
}
