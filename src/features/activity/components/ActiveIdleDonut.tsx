"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatDuration } from "@/features/activity/lib/format";
import { tooltipStyle } from "@/components/charts/chartTheme";
import { hex } from "@/styles/tokens";

const ACTIVE = hex.brand;
const IDLE = hex.attention;

export function ActiveIdleDonut({ activeSec, idleSec }: { activeSec: number; idleSec: number }) {
  const total = activeSec + idleSec;

  if (total <= 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-card bg-fill text-sm text-quiet">
        No active/idle time for this day.
      </div>
    );
  }

  const activePct = Math.round((activeSec / total) * 100);
  const slices = [
    { name: "Active", value: activeSec, color: ACTIVE },
    { name: "Idle", value: idleSec, color: IDLE },
  ];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative h-40 w-40 shrink-0">
        {/* Drawn for the eye only: the list beside it carries the same figures as text, and
            Recharts gives each slice an unnamed img role and the ring a tab stop (A-1). */}
        <div aria-hidden className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                rootTabIndex={-1}
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={2}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n) => [formatDuration(v), n]} {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-primary">{activePct}%</span>
          <span className="text-xs font-medium text-quiet">active</span>
        </div>
      </div>

      <ul className="space-y-2.5">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-soft">{s.name}</span>
            <span className="ml-auto pl-6 font-semibold tabular-nums text-primary">
              {formatDuration(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
