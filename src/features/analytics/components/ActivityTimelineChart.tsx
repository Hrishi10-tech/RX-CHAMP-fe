"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { HourActivity } from "@/features/analytics/types";
import { C, TOOLTIP_STYLE } from "@/features/analytics/lib/palette";

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

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={{ stroke: C.track }}
            interval={3}
          />
          <YAxis
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={false}
            unit="m"
            width={44}
          />
          <Tooltip formatter={(v: number, n) => [`${v} min`, n]} contentStyle={TOOLTIP_STYLE} />
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
