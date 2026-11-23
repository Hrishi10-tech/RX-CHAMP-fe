"use client";

import { useEffect } from "react";

import { RouteError } from "@/components/layout/RouteProblem";

/** A page outside the dashboard crashed (U-3). */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="min-h-screen bg-panel px-4 py-10">
      <RouteError onRetry={reset} />
    </main>
  );
}
