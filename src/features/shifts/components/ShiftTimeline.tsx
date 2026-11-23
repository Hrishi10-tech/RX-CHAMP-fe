"use client";

import { useMemo } from "react";

import { BREAK_LABEL, BREAK_SHORT_LABEL, deriveBreakTimes } from "@/features/shifts/lib/draft";
import { buildTimeline, type TimelineInput } from "@/features/shifts/lib/timeline";
import { formatHmRange } from "@/features/shifts/lib/time";
import { formatTime12, formatTimeCompact12 } from "@/lib/time/format";
import type { BreakKind } from "@/features/shifts/types";

const PALETTE: Record<BreakKind, { window: string; slot: string; text: string }> = {
  MORNING: { window: "bg-attention-edge/80", slot: "bg-attention", text: "text-attention-ink" },
  LUNCH: { window: "bg-brand-wash-strong", slot: "bg-brand", text: "text-brand-ink" },
  EVENING: { window: "bg-attention-edge/80", slot: "bg-attention", text: "text-attention-ink" },
};

/**
 * The shift drawn to scale: each break's window (light), the scheduled break
 * (dark) and the ring (outlined, when starting is on time). Screen readers get
 * the same facts as a list.
 */
export function ShiftTimeline({ input }: { input: TimelineInput }) {
  const timeline = useMemo(() => buildTimeline(input), [input]);

  if (!timeline) {
    return (
      <p className="rounded-xl border border-dashed border-card bg-fill px-4 py-6 text-center text-sm text-quiet">
        Set the shift&apos;s start and end to see the timeline.
      </p>
    );
  }

  const enabled = input.breaks.filter((b) => b.enabled);

  return (
    <figure className="space-y-3">
      <div aria-hidden className="relative h-[92px] w-full select-none">
        {/* Break names above their windows. */}
        {timeline.breaks.map((b) => (
          <div
            key={`label-${b.kind}`}
            className={`absolute top-0 truncate text-center text-xs font-semibold ${PALETTE[b.kind].text}`}
            style={{ left: `${b.window.left}%`, width: `${Math.max(b.window.width, 8)}%` }}
          >
            {BREAK_SHORT_LABEL[b.kind]}
          </div>
        ))}

        <div className="absolute left-0 right-0 top-6 h-9 overflow-hidden rounded-lg bg-panel">
          {timeline.breaks.map((b) => (
            <div key={`win-${b.kind}`}>
              <div
                className={`absolute inset-y-0 ${PALETTE[b.kind].window}`}
                style={{ left: `${b.window.left}%`, width: `${b.window.width}%` }}
              />
              <div
                className={`absolute inset-y-0 ${PALETTE[b.kind].slot}`}
                style={{ left: `${b.slot.left}%`, width: `max(3px, ${b.slot.width}%)` }}
              />
            </div>
          ))}
        </div>
        {timeline.breaks.map((b) => (
          <div
            key={`ring-${b.kind}`}
            className="absolute top-[18px] h-12 rounded border-2 border-working"
            style={{ left: `${b.ring.left}%`, width: `max(4px, ${b.ring.width}%)` }}
          />
        ))}

        <div className="absolute left-0 top-[72px] text-[0.6875rem] font-semibold tabular-nums text-soft">
          {formatTime12(input.start)}
        </div>
        <div className="absolute right-0 top-[72px] text-[0.6875rem] font-semibold tabular-nums text-soft">
          {formatTime12(input.end)}
        </div>
        {timeline.ticks.map((t) => (
          <div
            key={t.label}
            className="absolute top-[72px] w-12 -translate-x-1/2 whitespace-nowrap text-center text-[0.6875rem] tabular-nums text-quiet"
            style={{ left: `${t.left}%` }}
          >
            {formatTimeCompact12(t.label)}
          </div>
        ))}
      </div>

      <figcaption className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-soft">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-3.5 rounded-sm bg-attention-edge" />
          Window (can start)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-3.5 rounded-sm bg-attention" />
          Scheduled break
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-3.5 rounded-sm border-2 border-working" />
          Ringing: on time
        </span>
        <ul className="sr-only">
          {enabled.map((b) => {
            const d = deriveBreakTimes(b, input.rules);
            return (
              <li key={b.kind}>
                {BREAK_LABEL[b.kind]}: can start {formatHmRange(d.windowOpen, d.windowClose)},
                scheduled {formatHmRange(b.startTime, d.endTime)}, rings{" "}
                {formatHmRange(d.ringStart, d.ringEnd)}.
              </li>
            );
          })}
        </ul>
      </figcaption>
    </figure>
  );
}
