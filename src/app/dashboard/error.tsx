"use client";

import { useEffect } from "react";

import { RouteError } from "@/components/layout/RouteProblem";

/** A dashboard page crashed (U-3): the menu stays, the page offers a retry. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <RouteError onRetry={reset} home="/dashboard" />;
}
