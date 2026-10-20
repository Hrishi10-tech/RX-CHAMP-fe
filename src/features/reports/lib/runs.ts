import { formatDuration } from "@/lib/format/duration";
import { offlineText } from "@/lib/format/payroll";
import type { ReportRun } from "@/features/reports/types";

/**
 * The figures a run's summary carries, read defensively: each is null when the
 * server left it out (quiet hours and needs-a-look are dropped for a viewer
 * without the activity grant; paid and offline time are absent from older runs).
 */
export interface RunFigures {
  people: number | null;
  focusSec: number | null;
  paidSec: number | null;
  unverifiedSec: number | null;
  quietHours: number | null;
  needsALook: number | null;
}

export function runFigures(summary: Record<string, unknown> | null | undefined): RunFigures {
  const n = (key: string): number | null => {
    const v = summary?.[key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  return {
    people: n("people"),
    focusSec: n("focusSec"),
    paidSec: n("paidSec"),
    unverifiedSec: n("unverifiedSec"),
    quietHours: n("quietHours"),
    needsALook: n("needsALook"),
  };
}

/**
 * "Focus 160h 00m · paid time 170h 30m · 25m offline, no activity data": what
 * the run's summary carries. A figure the summary leaves out is left out here.
 */
export function runFiguresText(run: Pick<ReportRun, "summary">): string {
  const f = runFigures(run.summary);
  return [
    f.focusSec !== null ? `Focus ${formatDuration(f.focusSec)}` : null,
    f.paidSec !== null ? `paid time ${formatDuration(f.paidSec)}` : null,
    offlineText(f.unverifiedSec),
  ]
    .filter(Boolean)
    .join(" · ");
}
