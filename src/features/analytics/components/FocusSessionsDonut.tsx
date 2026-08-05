"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { FocusSessionBucket } from "@/features/analytics/types";
import { C, TOOLTIP_STYLE } from "@/features/analytics/lib/palette";

const COLORS = [C.indigo, C.violet, C.teal];

export function FocusSessionsDonut({
  total,
  buckets,
}: {
  total: number;
  buckets: FocusSessionBucket[];
}) {
  const rawSum = buckets.reduce((s, b) => s + b.count, 0);

  if (total <= 0 || rawSum <= 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-400">
        <span className="text-2xl font-bold text-slate-300">0</span>
        <p>No focus sessions today.</p>
      </div>
    );
  }

  const sum = rawSum;
  const pct = (v: number) => Math.round((v / sum) * 100);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={buckets}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {buckets.map((b, i) => (
                <Cell key={b.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, n) => [`${v} sessions`, n]}
              contentStyle={TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{total}</span>
          <span className="text-xs font-medium text-slate-400">Sessions</span>
        </div>
      </div>

      <ul className="flex-1 space-y-3">
        {buckets.map((b, i) => (
          <li key={b.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-slate-600">{b.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">
              {b.count} <span className="font-medium text-slate-400">({pct(b.count)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
