"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { HourActivity } from "@/features/analytics/types";
import { C } from "@/features/analytics/lib/palette";
import { chartGrid, axisTick, axisLine, tooltipStyle } from "@/components/charts/chartTheme";

const SERIES = [
  { key: "Active", color: C.indigo },
  { key: "Idle", color: C.amber },
] as const;

const toMin = (sec: number) => Math.round(sec / 60);

export function ActivityTimelineChart({ data }: { data: HourActivity[] }) {
  const rows = data.map((h) => ({
    label: h.hour,
    Active: toMin(h.activeSec),
    Idle: toMin(h.idleSec),
  }));

  // W-17: a day with nothing recorded says so, rather than drawing empty axes.
  if (!rows.some((r) => r.Active > 0 || r.Idle > 0)) {
    return (
      <div className="flex h-56 w-full items-center justify-center text-sm text-quiet">
        No activity recorded on this day.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" {...chartGrid} />
          <XAxis
            dataKey="label"
            tick={axisTick(11)}
            tickLine={false}
            axisLine={axisLine}
            interval={3}
          />
          <YAxis tick={axisTick(11)} tickLine={false} axisLine={false} unit="m" width={44} />
          <Tooltip formatter={(v: number, n) => [`${v} min`, n]} {...tooltipStyle} />
          {SERIES.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={s.color}
              radius={i === SERIES.length - 1 ? [3, 3, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const TIMELINE_LEGEND = SERIES;
