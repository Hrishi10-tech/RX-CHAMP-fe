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

import type { HourActivity } from "@/features/activity/types/hourly";
import {
  hourLabel,
  hourlyLabel,
  normalizeHours,
  spanHours,
  workSpan,
} from "@/features/teamToday/lib/hourly";
import {
  chartGrid,
  axisTick,
  axisLine,
  chartCursor,
  tokenColor,
} from "@/components/charts/chartTheme";

interface Point {
  hour: string;
  active: number;
  available: number;
  breakMin: number;
  meetingMin: number;
  quiet: boolean;
}

const INDIGO = tokenColor("brand");
const AMBER = tokenColor("attention");

function HourTooltip({ active, payload }: TooltipProps<number, string>) {
  const p = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-card bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-primary">{p.hour}</p>
      <p className="text-soft">
        {p.active} active min{p.quiet ? ", a quiet hour" : ""}
      </p>
      <p className="text-quiet">
        {p.available} min working · {p.breakMin} min break · {p.meetingMin} min meeting
      </p>
    </div>
  );
}

/**
 * Active keyboard and mouse minutes in each hour of one day, across the work
 * span. Quiet hours are amber; the dashed line is the quiet-hour threshold.
 * Managers and Super Admins only. Screen readers get the same numbers as a table.
 */
export function HourlyActivityChart({
  hours,
  name,
  startedAt,
  endedAt,
  quietBelow = 20,
}: {
  hours: HourActivity[];
  name: string;
  /** When the day's work began and ended ("now" while it runs): a night shift wraps. */
  startedAt?: string | null;
  endedAt?: string | null;
  quietBelow?: number;
}) {
  const normalized = useMemo(() => normalizeHours(hours), [hours]);
  const span = useMemo(
    () => workSpan(normalized, { startedAt, endedAt }),
    [normalized, startedAt, endedAt],
  );
  const data = useMemo<Point[]>(
    () =>
      span
        ? // In the order they happened: a night shift runs 18, … 23, 0, … 3.
          spanHours(span)
            .map((hour) => normalized[hour])
            .map((h) => ({
              hour: hourLabel(h.hour),
              active: Math.round(h.activeMin),
              available: Math.round(h.availableMin),
              breakMin: Math.round(h.breakMin),
              meetingMin: Math.round(h.meetingMin),
              quiet: h.quiet,
            }))
        : [],
    [normalized, span],
  );

  if (!span || data.length === 0) {
    return <p className="text-sm text-quiet">No keyboard or mouse activity on this day.</p>;
  }

  return (
    <div>
      <div role="img" aria-label={hourlyLabel(name, normalized, span)} className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid {...chartGrid} />
            <XAxis
              dataKey="hour"
              tickFormatter={(h: string) => h.slice(0, 2)}
              tick={axisTick(11)}
              tickLine={false}
              axisLine={axisLine}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 60]}
              ticks={[0, 20, 40, 60]}
              tickFormatter={(v: number) => (v ? `${v}m` : "0")}
              tick={axisTick(11)}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine
              y={quietBelow}
              stroke={tokenColor("attention")}
              strokeDasharray="4 3"
              ifOverflow="extendDomain"
            />
            <Tooltip content={<HourTooltip />} cursor={chartCursor} />
            <Bar dataKey="active" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>
              {data.map((p) => (
                <Cell key={p.hour} fill={p.quiet ? AMBER : INDIGO} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-soft">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-brand" />
          Active minutes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-attention" />
          Quiet hour
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t-2 border-dashed border-attention" />
          {quietBelow} min line
        </span>
      </div>
      {/* sr-only on the wrapper: a table ignores the 1px size and would stretch the page. */}
      <div className="sr-only">
        <table>
          <caption>Active minutes by hour</caption>
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Active minutes</th>
              <th scope="col">Quiet hour</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.hour}>
                <td>{p.hour}</td>
                <td>{p.active}</td>
                <td>{p.quiet ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
