import { type LucideIcon } from "lucide-react";

import type { KpiStat } from "@/features/analytics/types";
import { Sparkline } from "@/features/analytics/components/Sparkline";

export function StatTile({
  stat,
  icon: Icon,
  color,
}: {
  stat: KpiStat;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {stat.label}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
        </div>
        <div className="h-10 w-24 shrink-0">
          <Sparkline data={stat.spark} color={color} id={stat.key} />
        </div>
      </div>
    </div>
  );
}
