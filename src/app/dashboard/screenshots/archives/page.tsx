"use client";

import { ArchivesView } from "@/features/screenshots/components/ArchivesView";

/** Super Admin only (the route guard and the API both check). */
export default function ScreenshotArchivesPage() {
  return <ArchivesView />;
}
