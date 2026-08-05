import { Globe, Monitor } from "lucide-react";

import type { AppUsageRow, CurrentAppInfo } from "@/features/analytics/types";
import { CAT } from "@/features/analytics/lib/palette";
import { getAppIcon } from "@/features/analytics/lib/appIcons";
import { formatDuration } from "@/features/activity/lib/format";

function AppAvatar({
  name,
  fallbackColor,
  size = "sm",
}: {
  name: string;
  fallbackColor: string;
  size?: "sm" | "md";
}) {
  const icon = getAppIcon(name);
  const box = size === "md" ? "h-8 w-8 rounded-lg" : "h-7 w-7 rounded-lg text-xs";
  const glyph = size === "md" ? "h-4 w-4" : "h-4 w-4";
  const color = icon?.color ?? fallbackColor;

  return (
    <span
      className={`flex shrink-0 items-center justify-center font-bold ${box}`}
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {icon ? <icon.Icon className={glyph} /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

export function TopAppsWidget({
  data,
  current,
}: {
  data: AppUsageRow[];
  current?: CurrentAppInfo | null;
}) {
  const max = Math.max(...data.map((d) => d.seconds), 1);
  const showCurrent = Boolean(current?.app);
  const currentIcon = current?.app ? getAppIcon(current.app) : null;

  return (
    <div>
      {showCurrent && current?.app && (
        <div className="mb-4 rounded-xl border border-[rgba(34,34,204,0.15)] bg-[rgba(34,34,204,0.04)] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Currently Using
          </p>
          <div className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"
              style={{ color: currentIcon?.color ?? "rgb(34 34 204)" }}
            >
              {currentIcon ? (
                <currentIcon.Icon className="h-4 w-4" />
              ) : current.url ? (
                <Globe className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{current.app}</p>
              {current.title && (
                <p className="mt-0.5 truncate text-xs text-slate-500">{current.title}</p>
              )}
              {current.url && (
                <p className="mt-1 inline-flex max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {current.url}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <ul className="space-y-3.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-3">
            <AppAvatar name={d.name} fallbackColor={CAT[i % CAT.length]} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm text-slate-600">{d.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                  {formatDuration(d.seconds)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(d.seconds / max) * 100}%`,
                    backgroundColor: CAT[i % CAT.length],
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
