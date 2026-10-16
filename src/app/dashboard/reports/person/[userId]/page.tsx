"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { LoadingOverlay } from "@/components/ui/Loader";
import { todayKey } from "@/lib/time/businessTime";
import { resolveReturnTo } from "@/lib/nav/returnTo";
import { PersonDayView } from "@/features/reports/components/PersonDayView";
import { PersonMonthView } from "@/features/reports/components/PersonMonthView";
import { periodFromParams, wantsPrint } from "@/features/reports/lib/routeParams";

function PersonReport() {
  const { userId } = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const period = periodFromParams(searchParams, todayKey());
  const back = resolveReturnTo(searchParams, { href: "", label: "" });
  const backLink = back.href ? back : null;
  const autoPrint = wantsPrint(searchParams);

  return period.kind === "day" ? (
    <PersonDayView userId={userId} date={period.date} back={backLink} autoPrint={autoPrint} />
  ) : (
    <PersonMonthView userId={userId} month={period.month} back={backLink} autoPrint={autoPrint} />
  );
}

export default function PersonReportPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <PersonReport />
    </Suspense>
  );
}
