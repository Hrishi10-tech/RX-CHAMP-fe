"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import { formatDuration } from "@/lib/format/duration";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { HEAT_LEGEND, dayClassLook, heatShade } from "@/features/reports/lib/labels";
import { heatmapHours } from "@/features/reports/lib/heatmap";
import { hourLabel } from "@/features/teamToday/lib/hourly";
import type { DayClass, HeatmapDay, PersonDaySummary } from "@/features/reports/types";

/** The day classes the focus chart's legend names (the others rarely carry focus). */
export const FOCUS_LEGEND: DayClass[] = ["FULL", "HALF", "ABSENT", "EXTRA"];

interface DayPoint {
  day: string;
  date: string;
  hours: number;
  focusSec: number;
  dayClass: DayClass;
  span: string;
}

function DayTooltip({ active, payload }: TooltipProps<number, string>) {
  const p = active ? (payload?.[0]?.payload as DayPoint | undefined) : undefined;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">
        {formatDayWithWeekday(p.date)} · {dayClassLook(p.dayClass).label}
      </p>
      <p className="text-slate-600">Focus {formatDuration(p.focusSec)}</p>
      {p.span && <p className="text-slate-500">{p.span}</p>}
    </div>
  );
}

/** The most common expected length on working days (8h on a General shift). */
export function typicalExpectedSec(days: PersonDaySummary[]): number {
  const counts = new Map<number, number>();
  for (const d of days) {
    if (!d.workday || !d.expectedSec) continue;
    counts.set(d.expectedSec, (counts.get(d.expectedSec) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = 0;
  counts.forEach((count, sec) => {
    if (count > bestCount) {
      best = sec;
      bestCount = count;
    }
  });
  return best;
}

/** Focus time on each day of the month, coloured by attendance, against the expected line. */
export function FocusByDayChart({ days }: { days: PersonDaySummary[] }) {
  const data = useMemo<DayPoint[]>(
    () =>
      days.map((d) => ({
        day: String(Number(d.date.slice(8, 10))),
        date: d.date,
        // An absent day keeps a short stub so it reads as a day, not a gap; the
        // tooltip and the table carry the real 0m.
        hours:
          d.dayClass === "ABSENT" ? 0.15 : Math.round((Math.max(0, d.focusSec) / 3600) * 100) / 100,
        focusSec: Math.max(0, d.focusSec),
        dayClass: d.dayClass,
        span: d.startedAt
          ? `${formatTime12(d.startedAt)} to ${d.endedAt ? formatTime12(d.endedAt) : "now"}`
          : "",
      })),
    [days],
  );
  const expected = typicalExpectedSec(days) / 3600;
  const max = Math.max(10, Math.ceil(Math.max(expected, ...data.map((d) => d.hours)) / 2) * 2);
  const full = days.filter((d) => d.dayClass === "FULL").length;
  const half = days.filter((d) => d.dayClass === "HALF").length;
  const absent = days.filter((d) => d.dayClass === "ABSENT").length;

  return (
    <div>
      <div
        role="img"
        aria-label={`Focus time by day: ${full} full days, ${half} half days, ${absent} absent${
          expected ? `, against ${formatDuration(expected * 3600)} expected` : ""
        }. Every day is listed in the table below.`}
        className="h-56 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="rgb(238 242 246)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "rgb(100 116 139)" }}
              tickLine={false}
              axisLine={{ stroke: "rgb(203 213 225)" }}
              interval="preserveStartEnd"
              minTickGap={6}
            />
            <YAxis
              domain={[0, max]}
              tickFormatter={(v: number) => (v ? `${v}h` : "0")}
              tick={{ fontSize: 11, fill: "rgb(100 116 139)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            {expected > 0 && (
              <ReferenceLine y={expected} stroke="rgb(51 65 85)" strokeDasharray="5 4" />
            )}
            <Tooltip content={<DayTooltip />} cursor={{ fill: "rgba(34,34,204,0.05)" }} />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
              {data.map((p) => (
                <Cell key={p.date} fill={dayClassLook(p.dayClass).fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {FOCUS_LEGEND.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            {/* The bars' own colour, so key and chart cannot drift apart. */}
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: dayClassLook(c).fill }}
            />
            {dayClassLook(c).label}
          </span>
        ))}
        {expected > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="w-4 border-t-2 border-dashed border-slate-700" />
            {formatDuration(expected * 3600)} expected
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Active minutes in each hour of each day as a grid of shaded cells. Only the
 * hours anyone was active show as columns; a month with more of them than a
 * phone has room for scrolls inside its card, the day column staying put.
 */
export function MonthHeatmap({
  heatmap,
  days,
}: {
  heatmap: HeatmapDay[];
  /** The month's days, for when each day's work began and ended (night shifts wrap). */
  days: Pick<PersonDaySummary, "startedAt" | "endedAt">[];
}) {
  const { rows, hours } = useMemo(() => {
    const withData = heatmap
      .map((d) => ({ date: d.date, hours: (Array.isArray(d.hours) ? d.hours : []).slice(0, 24) }))
      .filter((d) => d.hours.some((m) => typeof m === "number" && m > 0))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { rows: withData, hours: heatmapHours(withData, days) };
  }, [heatmap, days]);

  if (rows.length === 0 || hours.length === 0) {
    return <p className="text-sm text-slate-500">No keyboard or mouse activity this month.</p>;
  }

  const avg = hours.map((h) => {
    const vals = rows.map((r) => r.hours[h] ?? 0).filter((m) => m > 0);
    return vals.length ? Math.round(vals.reduce((s, m) => s + m, 0) / vals.length) : 0;
  });
  const busiest = hours[avg.indexOf(Math.max(...avg))];
  // Every column keeps room for "45": the grid is never squeezed into wrapping,
  // it scrolls inside the card instead.
  const cols = `3.5rem repeat(${hours.length}, minmax(1.25rem, 1fr))`;

  return (
    <div className="space-y-3">
      <div
        role="img"
        tabIndex={0}
        aria-label={`Active minutes by hour on ${rows.length} days, ${hourLabel(hours[0])} to ${hourLabel((hours[hours.length - 1] + 1) % 24)}. Busiest hour on average: ${hourLabel(busiest)}.`}
        className="overflow-x-auto rounded-lg pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
      >
        <div
          className="grid w-max min-w-full gap-[2px] text-[10px] tabular-nums text-slate-500"
          style={{ gridTemplateColumns: cols }}
          aria-hidden
        >
          <span className="sticky left-0 z-10 bg-white" />
          {hours.map((h) => (
            <span key={h} className="text-center">
              {String(h).padStart(2, "0")}
            </span>
          ))}
          {rows.map((r) => (
            <div key={r.date} className="contents">
              <span className="sticky left-0 z-10 truncate bg-white pr-1 text-slate-600">
                {formatDayWithWeekday(r.date).replace(/ \w+$/, "")}
              </span>
              {hours.map((h) => {
                const m = Math.max(0, Math.round(r.hours[h] ?? 0));
                return (
                  <span
                    key={h}
                    title={`${formatDayWithWeekday(r.date)}, ${hourLabel(h)} · ${m} active min`}
                    className={`h-3.5 rounded-[2px] ${heatShade(m)}`}
                  />
                );
              })}
            </div>
          ))}
          <span className="sticky left-0 z-10 bg-white pt-1 text-slate-600">Avg</span>
          {avg.map((v, i) => (
            <span key={hours[i]} className="pt-1 text-center font-semibold text-slate-700">
              {v}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>Active minutes</span>
        {HEAT_LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${l.shade}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
