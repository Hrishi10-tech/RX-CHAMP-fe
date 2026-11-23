import type { AppUsage } from "@/features/activity/types";
import { formatDuration } from "@/features/activity/lib/format";
import { hex } from "@/styles/tokens";

const BRAND = hex.brand;

export function TopAppsList({
  items,
  emptyLabel = "No usage recorded for this day.",
}: {
  items: AppUsage[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-quiet">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.seconds), 1);

  return (
    // Scrolls rather than stretches: these lists hold everything the person used
    // that day, not a top ten, so a busy day would otherwise run off the card.
    <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
      {items.map((item) => (
        <li key={item.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-body">{item.name}</span>
            <span className="shrink-0 tabular-nums text-quiet">{formatDuration(item.seconds)}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-panel">
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
