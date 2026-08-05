"use client";

import { format, parseISO } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FocusTrendPoint } from "@/features/analytics/types";
import { C, TOOLTIP_STYLE } from "@/features/analytics/lib/palette";
import { formatDuration } from "@/features/activity/lib/format";

const toHours = (sec: number) => +(sec / 3600).toFixed(2);
const dayLabel = (iso: string) => {
  try {
    return format(parseISO(iso), "MMM d");
  } catch {
    return iso;
  }
};

export function FocusTimeTrend({ data }: { data: FocusTrendPoint[] }) {
  const rows = data.map((p) => ({
    label: dayLabel(p.date),
    hours: toHours(p.seconds),
    seconds: p.seconds,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={{ stroke: C.track }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={false}
            unit="h"
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(_v: number, _n, item) => [
              formatDuration((item?.payload as { seconds: number }).seconds),
              "Focus",
            ]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Line
            type="monotone"
            dataKey="hours"
            stroke={C.indigo}
            strokeWidth={2}
            dot={{ r: 3, fill: C.indigo, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
