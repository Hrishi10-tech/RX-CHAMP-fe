"use client";

import { useEffect, useState } from "react";

import type { CurrentActivity, RecentApp } from "@/features/activity/types";

export function useRecentApps(current: CurrentActivity | null, max = 5): RecentApp[] {
  const [recent, setRecent] = useState<RecentApp[]>([]);

  useEffect(() => {
    const app = current?.app;
    if (!app || current?.status === "OFFLINE") return;

    setRecent((prev) => {
      const entry: RecentApp = {
        app,
        title: current?.title ?? null,
        url: current?.url ?? null,
        lastUsedAt: current?.lastSampleAt ?? null,
      };
      const rest = prev.filter((r) => r.app !== app);
      return [entry, ...rest].slice(0, max);
    });
  }, [current, max]);

  return recent;
}
