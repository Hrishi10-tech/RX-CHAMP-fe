"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { C, TOOLTIP_STYLE } from "@/features/analytics/lib/palette";
import { formatHour12 } from "@/lib/time/format";
import type { TimelineBucket } from "@/features/productivity/types";

/** Work, breaks, lunch and meetings per hour: the presence timeline (grant `timeline`). */
export const PRESENCE_SERIES = [
  { key: "Work", field: "workSec", color: C.indigo },
  { key: "Break", field: "breakSec", color: C.teal },
  { key: "Lunch", field: "lunchSec", color: C.violet },
  { key: "Meeting", field: "meetingSec", color: "#0ea5e9" },
] as const;

const toMin = (sec: number | undefined) => Math.round((sec ?? 0) / 60);

/** "13:00" from the API, as "1 PM" on the axis. */
function hourLabel(start: string): string {
  const hour = Number(start.slice(0, 2));
  return Number.isFinite(hour) ? formatHour12(hour) : start;
}

export function presenceRows(buckets: TimelineBucket[]) {
  return buckets.map((b) => {
    const row: Record<string, string | number> = { label: hourLabel(b.start) };
    for (const s of PRESENCE_SERIES) row[s.key] = toMin(b[s.field]);
    return row;
  });
}

export function PresenceTimelineChart({ buckets }: { buckets: TimelineBucket[] }) {
  const rows = presenceRows(buckets);
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
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
          {PRESENCE_SERIES.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="p"
              fill={s.color}
              radius={i === PRESENCE_SERIES.length - 1 ? [3, 3, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
