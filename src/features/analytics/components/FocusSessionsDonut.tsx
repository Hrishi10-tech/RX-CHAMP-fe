"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { FocusSessionBucket } from "@/features/analytics/types";
import { C } from "@/features/analytics/lib/palette";
import { tooltipStyle } from "@/components/charts/chartTheme";

// Buckets run longest-first (`> 60 min`, `30–60 min`, `15–30 min`), so the ramp
// reads as a verdict: a long unbroken stretch is the good outcome, a short one
// means focus kept breaking.
const COLORS = [C.green, C.amber, C.red];

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
      <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-card bg-fill text-center text-sm text-quiet">
        <span className="text-2xl font-bold text-faint">0</span>
        <p>No focus sessions today.</p>
      </div>
    );
  }

  const sum = rawSum;
  const pct = (v: number) => Math.round((v / sum) * 100);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        {/* Drawn for the eye only: the list beside it carries the same figures as text, and
            Recharts gives each slice an unnamed img role and the ring a tab stop (A-1). */}
        <div aria-hidden className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                rootTabIndex={-1}
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
              <Tooltip formatter={(v: number, n) => [`${v} sessions`, n]} {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-primary">{total}</span>
          <span className="text-xs font-medium text-quiet">Sessions</span>
        </div>
      </div>

      <ul className="flex-1 space-y-3">
        {buckets.map((b, i) => (
          <li key={b.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-soft">{b.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-primary">
              {b.count} <span className="font-medium text-quiet">({pct(b.count)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
