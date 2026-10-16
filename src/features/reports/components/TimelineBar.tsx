"use client";

import { useMemo } from "react";

import { formatDuration } from "@/lib/format/duration";
import { BUSINESS_TIMEZONE, hmOf } from "@/lib/time/businessTime";
import { layoutTimeline, zoneOffsetMs } from "@/features/reports/lib/timeline";
import { TIMELINE, timelineLook } from "@/features/reports/lib/labels";
import type { ReportSkip, TimelineKind, TimelineSegment } from "@/features/reports/types";

const LEGEND_ORDER: TimelineKind[] = ["WORK", "MEETING", "BREAK", "LUNCH"];

/**
 * The day from Start Day to End Day as one bar: focus, meetings, breaks and
 * lunch, with skipped breaks marked where they were skipped. The bar is a
 * picture; the same events are listed for screen readers right after it.
 */
export function TimelineBar({
  timeline,
  skips,
}: {
  timeline: TimelineSegment[];
  skips: ReportSkip[];
}) {
  const layout = useMemo(() => {
    const first = timeline.map((s) => Date.parse(s.startedAt)).find((t) => !Number.isNaN(t));
    const offset = first !== undefined ? zoneOffsetMs(first, BUSINESS_TIMEZONE) : 0;
    return layoutTimeline(timeline, skips, offset);
  }, [timeline, skips]);

  if (!layout) {
    return <p className="text-sm text-slate-500">Nothing was recorded on this day.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden pb-6 pt-6" aria-hidden>
        {/* Hour ticks: every hour from sm up, every other hour on a phone. */}
        {layout.ticks.map((t, i) => (
          <span
            key={t.ms}
            className={`absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-slate-500 ${
              i % 2 === 1 ? "hidden sm:block" : ""
            } ${i === 0 ? "translate-x-0" : ""} ${i === layout.ticks.length - 1 ? "-translate-x-full" : ""}`}
            style={{ left: `${t.left}%` }}
          >
            {hmOf(new Date(t.ms).toISOString())}
          </span>
        ))}
        <div className="relative h-9 overflow-hidden rounded-lg bg-slate-100">
          {layout.ticks.map((t) => (
            <span
              key={t.ms}
              className="absolute inset-y-0 w-px bg-white/70"
              style={{ left: `${t.left}%` }}
            />
          ))}
          {layout.segments.map((s, i) => (
            <span
              key={`${s.startedAt}-${i}`}
              title={`${hmOf(s.startedAt)} to ${hmOf(s.endedAt)} · ${s.label} · ${formatDuration(s.seconds)}`}
              className={`absolute inset-y-0 ${timelineLook(s.kind).bar}`}
              style={{ left: `${s.left}%`, width: `${s.width}%` }}
            />
          ))}
        </div>
        {layout.markers.map((m) => (
          <span key={m.at}>
            <span
              className="absolute top-5 h-11 w-0 border-l-2 border-dashed border-violet-500"
              style={{ left: `${m.left}%` }}
            />
            {/* The label hangs off the line, away from the nearer edge, so it never spills out. */}
            <span
              className={`absolute bottom-0 whitespace-nowrap rounded border border-violet-200 bg-violet-50 px-1 text-[10px] font-semibold text-violet-700 ${
                m.left > 70 ? "-translate-x-full" : m.left > 30 ? "-translate-x-1/2" : ""
              }`}
              style={{ left: `${m.left}%` }}
            >
              {m.label} skipped
            </span>
          </span>
        ))}
      </div>

      <ol className="sr-only">
        {layout.segments.map((s, i) => (
          <li key={`${s.startedAt}-${i}`}>
            {hmOf(s.startedAt)} to {hmOf(s.endedAt)}: {s.label}, {formatDuration(s.seconds)}
          </li>
        ))}
        {layout.markers.map((m) => (
          <li key={m.at}>
            {hmOf(m.at)}: {m.label} skipped
          </li>
        ))}
      </ol>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-700" aria-label="Totals">
        {LEGEND_ORDER.filter((k) => layout.totals[k]).map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-4 rounded-sm ${TIMELINE[k].swatch}`} />
            {TIMELINE[k].label}
            <span className="font-semibold tabular-nums text-slate-900">
              {formatDuration(layout.totals[k] ?? 0)}
            </span>
          </li>
        ))}
        {layout.markers.length > 0 && (
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-0 border-l-2 border-dashed border-violet-500" />
            Skipped break
          </li>
        )}
      </ul>
    </div>
  );
}
