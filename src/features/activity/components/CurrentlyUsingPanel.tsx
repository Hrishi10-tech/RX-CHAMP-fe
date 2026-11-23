import { AppWindow, Globe, MonitorOff } from "lucide-react";

import type { CurrentActivity, RecentApp } from "@/features/activity/types";
import { ActivityStatusBadge } from "@/features/activity/components/ActivityStatusBadge";
import { formatAgo, formatAgoFromIso } from "@/features/activity/lib/format";

function AppIcon({ url }: { url: string | null }) {
  return (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel text-quiet">
      {url ? <Globe className="h-5 w-5" /> : <AppWindow className="h-5 w-5" />}
    </span>
  );
}

function RecentRow({ item }: { item: RecentApp }) {
  const ago = formatAgoFromIso(item.lastUsedAt);
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-panel text-quiet">
        {item.url ? <Globe className="h-3.5 w-3.5" /> : <AppWindow className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-soft">
        {item.app}
        {item.url && <span className="ml-1.5 text-xs text-quiet">{item.url}</span>}
      </span>
      {ago && <span className="shrink-0 text-xs tabular-nums text-quiet">{ago}</span>}
    </li>
  );
}

export function CurrentlyUsingPanel({
  current,
  recent = [],
}: {
  current: CurrentActivity | null;
  recent?: RecentApp[];
}) {
  const isOffline = !current || current.status === "OFFLINE";
  const heroApp = !isOffline && current?.app ? current.app : null;

  const recentToShow = recent.filter((r) => r.app !== heroApp).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <ActivityStatusBadge status={current?.status ?? "OFFLINE"} />
        {current?.lastSampleAt && (
          <span className="text-xs text-quiet">Last seen {formatAgo(current.staleSec)}</span>
        )}
      </div>

      {heroApp ? (
        <div className="flex items-start gap-3 rounded-xl border border-card bg-card px-4 py-4">
          <AppIcon url={current!.url} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary">{current!.app}</p>
            {current!.title && (
              <p className="mt-0.5 truncate text-xs text-quiet">{current!.title}</p>
            )}
            {current!.url && (
              <p className="mt-1 inline-flex max-w-full truncate rounded bg-panel px-1.5 py-0.5 text-xs font-medium text-soft">
                {current!.url}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-card bg-fill px-4 py-5 text-quiet">
          <MonitorOff className="h-5 w-5 shrink-0" />
          <p className="text-sm">Agent isn&apos;t reporting right now. Nothing to show.</p>
        </div>
      )}

      {recentToShow.length > 0 && (
        <div className="border-t border-divider pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-quiet">
            Recently Used
          </h3>
          <ul className="space-y-2.5">
            {recentToShow.map((item) => (
              <RecentRow key={item.app} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
