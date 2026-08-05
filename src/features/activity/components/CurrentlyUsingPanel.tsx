import { AppWindow, Globe, MonitorOff } from "lucide-react";

import type { CurrentActivity, RecentApp } from "@/features/activity/types";
import { ActivityStatusBadge } from "@/features/activity/components/ActivityStatusBadge";
import { formatAgo, formatAgoFromIso } from "@/features/activity/lib/format";

function AppIcon({ url }: { url: string | null }) {
  return (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      {url ? <Globe className="h-5 w-5" /> : <AppWindow className="h-5 w-5" />}
    </span>
  );
}

function RecentRow({ item }: { item: RecentApp }) {
  const ago = formatAgoFromIso(item.lastUsedAt);
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
        {item.url ? <Globe className="h-3.5 w-3.5" /> : <AppWindow className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
        {item.app}
        {item.url && <span className="ml-1.5 text-xs text-slate-400">{item.url}</span>}
      </span>
      {ago && <span className="shrink-0 text-xs tabular-nums text-slate-400">{ago}</span>}
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
          <span className="text-xs text-slate-400">Last seen {formatAgo(current.staleSec)}</span>
        )}
      </div>

      {heroApp ? (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4">
          <AppIcon url={current!.url} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{current!.app}</p>
            {current!.title && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{current!.title}</p>
            )}
            {current!.url && (
              <p className="mt-1 inline-flex max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                {current!.url}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-slate-400">
          <MonitorOff className="h-5 w-5 shrink-0" />
          <p className="text-sm">Agent isn&apos;t reporting right now — nothing to show.</p>
        </div>
      )}

      {recentToShow.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
