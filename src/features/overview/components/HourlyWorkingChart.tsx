"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { C, TOOLTIP_STYLE } from "@/features/analytics/lib/palette";
import { formatHour12 } from "@/lib/time/format";

const BRAND = "rgb(34 34 204)";
const BRAND_MUTED = "rgba(34,34,204,0.22)";

/** How many people were working in each hour of today (SPEC 7.2), 12-hour axis. */
export function HourlyWorkingChart({
  data,
  currentHour,
}: {
  data: { hour: number; working: number }[];
  /** Highlighted: the hour we are in. */
  currentHour?: number;
}) {
  // From the first hour anyone worked to the last (or now), so the bars fill the card.
  const busy = data.filter((d) => d.working > 0).map((d) => d.hour);
  const first = busy.length ? Math.min(...busy, currentHour ?? 24) : 8;
  const last = busy.length ? Math.max(...busy, currentHour ?? 0) : 19;
  const byHour = new Map(data.map((d) => [d.hour, d.working]));
  const rows = [];
  for (let h = Math.max(0, first - 1); h <= Math.min(23, last + 1); h++) {
    rows.push({ hour: h, label: formatHour12(h), working: byHour.get(h) ?? 0 });
  }

  return (
    <div className="h-60 w-full" role="img" aria-label="Working people by hour today">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={{ stroke: C.track }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "rgba(34,34,204,0.06)" }}
            formatter={(v: number) => [`${v} ${v === 1 ? "person" : "people"}`, "Working"]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="working" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {rows.map((r) => (
              <Cell key={r.hour} fill={r.hour === currentHour ? BRAND : BRAND_MUTED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
