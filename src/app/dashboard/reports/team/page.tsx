"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { LoadingOverlay } from "@/components/ui/Loader";
import { todayKey } from "@/lib/time/businessTime";
import { resolveReturnTo } from "@/lib/nav/returnTo";
import { TeamDayView } from "@/features/reports/components/TeamDayView";
import { TeamMonthView } from "@/features/reports/components/TeamMonthView";
import { peopleFromParams, periodFromParams, wantsPrint } from "@/features/reports/lib/routeParams";

function TeamReport() {
  const searchParams = useSearchParams();
  const key = searchParams.toString();
  const period = useMemo(() => periodFromParams(searchParams, todayKey()), [searchParams]);
  // Stable objects per URL, so the report queries keep the same keys between renders.
  const people = useMemo(() => peopleFromParams(new URLSearchParams(key)), [key]);
  const back = resolveReturnTo(searchParams, { href: "", label: "" });
  const backLink = back.href ? back : null;
  const autoPrint = wantsPrint(searchParams);

  const dayParams = useMemo(
    () => (period.kind === "day" ? { date: period.date, userIds: people.userIds } : null),
    [period, people],
  );
  const monthParams = useMemo(
    () =>
      period.kind === "month"
        ? { month: period.month, managerId: people.managerId, userIds: people.userIds }
        : null,
    [period, people],
  );

  if (dayParams) return <TeamDayView params={dayParams} back={backLink} autoPrint={autoPrint} />;
  if (monthParams) {
    return <TeamMonthView params={monthParams} back={backLink} autoPrint={autoPrint} />;
  }
  return null;
}

export default function TeamReportPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <TeamReport />
    </Suspense>
  );
}
