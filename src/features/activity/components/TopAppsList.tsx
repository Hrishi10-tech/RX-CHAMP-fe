import type { AppUsage } from "@/features/activity/types";
import { formatDuration } from "@/features/activity/lib/format";

const BRAND = "rgb(34 34 204)";

export function TopAppsList({
  items,
  emptyLabel = "No usage recorded for this day.",
}: {
  items: AppUsage[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.seconds), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{item.name}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {formatDuration(item.seconds)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.seconds / max) * 100}%`,
                backgroundColor: BRAND,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
