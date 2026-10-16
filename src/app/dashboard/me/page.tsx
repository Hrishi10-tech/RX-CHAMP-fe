"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useSession } from "@/features/auth/hooks/useSession";
import { ProductivityDashboard } from "@/features/analytics/components/ProductivityDashboard";
import { MyBreaksView } from "@/features/breaks/components/MyBreaksView";
import { FocusTodayCard } from "@/features/workday/components/FocusTodayCard";
import { LoadingOverlay } from "@/components/ui/Loader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

type Tab = "focus" | "productivity" | "breaks";

const STAFF_TABS: { value: Tab; label: string }[] = [
  { value: "focus", label: "Focus time" },
  { value: "breaks", label: "My breaks" },
];

const APPROVER_TABS: { value: Tab; label: string }[] = [
  { value: "productivity", label: "Productivity" },
  { value: "focus", label: "Focus time" },
  { value: "breaks", label: "My breaks" },
];

/**
 * Home. Staff see their focus time (no activity charts or percentages: 3.1
 * keeps keyboard and mouse data to managers) and their breaks. Managers and
 * Super Admins keep the productivity view and get the same focus card.
 */
function MyDashboard() {
  const { user, role, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!ready) return <LoadingOverlay label="Loading…" />;

  const staff = role !== "MANAGER" && role !== "SUPER_ADMIN";
  const tabs = staff ? STAFF_TABS : APPROVER_TABS;
  const fallback: Tab = staff ? "focus" : "productivity";
  const asked = searchParams.get("tab");
  // In the URL so a "your break was decided" notification can open My breaks.
  const tab: Tab = tabs.some((t) => t.value === asked) ? (asked as Tab) : fallback;

  function select(next: Tab) {
    router.replace(next === fallback ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      {staff && (
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {user?.name ? `Hello, ${user.name.split(" ")[0]}` : "My day"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your focus time and breaks, from the RX Vision app. Times are in the business time zone.
          </p>
        </header>
      )}
      <SegmentedTabs label="My dashboard" idPrefix="me" value={tab} onChange={select} tabs={tabs} />
      <div id="me-panel" role="tabpanel" aria-labelledby={`me-tab-${tab}`}>
        {tab === "breaks" ? (
          <MyBreaksView />
        ) : tab === "focus" || staff ? (
          <FocusTodayCard isApprover={!staff} />
        ) : (
          <ProductivityDashboard userId={user?.id ?? "me"} userName={user?.name} />
        )}
      </div>
    </div>
  );
}

export default function MyDashboardPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <MyDashboard />
    </Suspense>
  );
}
