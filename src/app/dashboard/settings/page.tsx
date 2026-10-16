"use client";

import { SettingsView } from "@/features/settings/components/SettingsView";

/** Super Admin only (the route guard and the API both check). */
export default function SettingsPage() {
  return <SettingsView />;
}
