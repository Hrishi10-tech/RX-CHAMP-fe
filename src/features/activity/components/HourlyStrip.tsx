"use client";

import { useMemo } from "react";

import type { HourActivity } from "@/features/activity/types/hourly";
import {
  barHeight,
  hourLabel,
  hourOrder,
  hourlyLabel,
  inSpan,
  normalizeHours,
  workSpan,
} from "@/features/teamToday/lib/hourly";

/**
 * 24 bars, one per hour, of keyboard and mouse minutes. Bars only across the
 * work span (first to last hour of the day); hours outside it are a dotted
 * baseline. Quiet hours are amber. Drawn 00 to 23, unless the day's work really
 * ran past midnight (a night shift): then in one piece, its hours after midnight
 * following 23 (the ticks say where the strip starts). Managers and Super
 * Admins only: never render this on a staff screen.
 */
export function HourlyStrip({
  hours,
  name,
  startedAt,
  endedAt,
  height = 28,
}: {
  hours: HourActivity[] | null | undefined;
  /** Whose day it is, for the screen-reader description. */
  name: string;
  /** When the day's work began and ended ("now" while it runs). */
  startedAt?: string | null;
  endedAt?: string | null;
  height?: number;
}) {
  const normalized = useMemo(() => normalizeHours(hours), [hours]);
  const span = useMemo(
    () => workSpan(normalized, { startedAt, endedAt }),
    [normalized, startedAt, endedAt],
  );
  const order = hourOrder(span);
  const ticks = [0, 6, 12, 18].map((i) => String(order[i]).padStart(2, "0"));

  return (
    <div
      role="img"
      aria-label={hourlyLabel(name, normalized, span)}
      className="w-[198px] max-w-full"
    >
      <div
        className="grid grid-cols-[repeat(24,minmax(0,1fr))] items-end gap-[2px]"
        style={{ height }}
        aria-hidden
      >
        {order.map((hour) => {
          const h = normalized[hour];
          if (!inSpan(span, hour)) {
            return <span key={h.hour} className="h-px border-b border-dotted border-slate-300" />;
          }
          return (
            <span
              key={h.hour}
              title={`${hourLabel(h.hour)} · ${Math.round(h.activeMin)} active min${
                h.quiet ? ", quiet hour" : ""
              }`}
              className={`rounded-t-sm ${h.quiet ? "bg-amber-500" : "bg-indigo-600"}`}
              style={{ height: barHeight(h.activeMin, height) }}
            />
          );
        })}
      </div>
      <div className="mt-0.5 grid grid-cols-4 text-[10px] tabular-nums text-slate-500" aria-hidden>
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export function HourlyLegend({ quietBelow }: { quietBelow?: number }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />
        Keyboard and mouse minutes, each hour
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        Quiet hour{quietBelow ? ` (under ${quietBelow} active min)` : ""}
      </span>
    </span>
  );
}
