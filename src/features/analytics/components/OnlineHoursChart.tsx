"use client";

import { format, parseISO } from "date-fns";
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
} from "recharts";

import type { OnlineHoursPoint } from "@/features/analytics/types";
import {
  axisLine,
  axisTick,
  chartGrid,
  tokenColor,
  tooltipStyle,
} from "@/components/charts/chartTheme";
import { hex } from "@/styles/tokens";

const BRAND = hex.brand;
const BRAND_MUTED = tokenColor("brand", 0.28);
const TEAL = hex.brand;

const toHours = (sec: number) => +(sec / 3600).toFixed(2);
const dayLabel = (iso: string) => {
  try {
    return format(parseISO(iso), "EEE d");
  } catch {
    return iso;
  }
};

export function OnlineHoursChart({ data }: { data: OnlineHoursPoint[] }) {
  const rows = data.map((d) => ({
    date: d.date,
    label: dayLabel(d.date),
    hours: toHours(d.seconds),
  }));
  const avg =
    rows.length > 0 ? +(rows.reduce((s, r) => s + r.hours, 0) / rows.length).toFixed(2) : 0;
  const lastDate = rows.at(-1)?.date;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" {...chartGrid} />
          <XAxis dataKey="label" tick={axisTick(11)} tickLine={false} axisLine={axisLine} />
          <YAxis
            tick={axisTick(11)}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            unit="h"
            width={40}
          />
          <Tooltip
            cursor={{ fill: tokenColor("brand", 0.06) }}
            formatter={(v: number) => [`${v} h`, "Online"]}
            {...tooltipStyle}
          />
          {avg > 0 && <ReferenceLine y={avg} stroke={TEAL} strokeWidth={2} strokeDasharray="5 4" />}
          <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {rows.map((r) => (
              <Cell key={r.date} fill={r.date === lastDate ? BRAND : BRAND_MUTED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
