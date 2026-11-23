"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { todayKey } from "@/lib/time/businessTime";
import { getArchiveNudge } from "@/features/screenshots/api/exports";
import { exportKeys } from "@/features/screenshots/api/keys";

export const ARCHIVES_HREF = "/dashboard/screenshots/archives";

const SEEN_KEY = "rxv.screenshotArchiveNudge";

/** The day this browser last showed the reminder. Storage can be missing or blocked. */
function shownOn(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function markShown(day: string): void {
  try {
    window.localStorage.setItem(SEEN_KEY, day);
  } catch {
    // Without storage the reminder may show again on the next visit; that is fine.
  }
}

/**
 * The monthly archive reminder for a Super Admin (3.2, fix 7): once a day, a
 * toast naming the oldest ended month that still holds screenshots and what is
 * left to do (archive, download, delete), with a link to the archive page.
 * January is due by the end of February.
 */
export function useArchiveNudge(enabled: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: exportKeys.nudge(),
    queryFn: getArchiveNudge,
    enabled,
    staleTime: 30 * 60_000,
    refetchInterval: 6 * 60 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!enabled || !data) return;
    if (pathname === ARCHIVES_HREF || pathname?.startsWith(`${ARCHIVES_HREF}/`)) return;
    const today = todayKey();
    if (shownOn() === today) return;
    markShown(today);
    toast(data.overdue ? `${data.label} screenshots are overdue` : `${data.label} screenshots`, {
      description: data.message,
      duration: 15_000,
      action: { label: "Open", onClick: () => router.push(ARCHIVES_HREF) },
    });
  }, [enabled, data, pathname, router]);

  return data ?? null;
}
