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
    <div className="rounded-2xl border border-card bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-quiet">
          {stat.label}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-3xl font-bold tabular-nums tracking-tight text-primary">
            {stat.value}
          </p>
          {/* 3.6 (W-22): the change the API already sends, with a true minus sign. */}
          {stat.deltaPct != null && Number.isFinite(stat.deltaPct) && (
            <p
              className={`mt-0.5 text-xs font-semibold tabular-nums ${
                stat.deltaPct > 0
                  ? "text-working"
                  : stat.deltaPct < 0
                    ? "text-attention"
                    : "text-quiet"
              }`}
            >
              {stat.deltaPct > 0 ? "+" : stat.deltaPct < 0 ? "\u2212" : ""}
              {Math.abs(Math.round(stat.deltaPct))}% vs the day before
            </p>
          )}
        </div>
        <div className="w-24 shrink-0">
          <div className="h-10">
            <Sparkline data={stat.spark} color={color} id={stat.key} />
          </div>
          <p className="text-right text-xs text-quiet">7 days</p>
        </div>
      </div>
    </div>
  );
}
