import { formatDuration } from "@/lib/format/duration";
import { inputShare } from "@/features/reports/lib/dayNotes";

const PARTS = [
  { key: "active", label: "Active", bar: "bg-indigo-600", dot: "bg-indigo-600" },
  { key: "idle", label: "Idle", bar: "bg-amber-400", dot: "bg-amber-400" },
  { key: "noData", label: "No data", bar: "bg-slate-300", dot: "bg-slate-300" },
] as const;

/**
 * Keyboard and mouse input inside the available time (3.2, fix 10): active,
 * idle (nobody at the computer, or the screen locked) and no data (the agent
 * was not reporting), as one bar and three numbers.
 */
export function InputBreakdown({
  input,
}: {
  input:
    | { activeSec: number; idleSec: number; noDataSec: number; availableSec: number }
    | null
    | undefined;
}) {
  const share = inputShare(input);
  if (!share) {
    return <p className="text-sm text-slate-500">No working time to measure on this day.</p>;
  }
  const values = {
    active: { sec: share.activeSec, pct: share.activePct },
    idle: { sec: share.idleSec, pct: share.idlePct },
    noData: { sec: share.noDataSec, pct: share.noDataPct },
  };
  return (
    <div className="space-y-3">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`Of ${formatDuration(share.availableSec)} available: ${share.activePct}% active, ${share.idlePct}% idle, ${share.noDataPct}% no data`}
      >
        {PARTS.map((p) =>
          values[p.key].pct > 0 ? (
            <span
              key={p.key}
              className={`h-full ${p.bar}`}
              style={{ width: `${values[p.key].pct}%` }}
            />
          ) : null,
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        {PARTS.map((p) => (
          <div key={p.key} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${p.dot}`} />
              {p.label}
            </dt>
            <dd className="mt-0.5 tabular-nums">
              <span className="font-semibold text-slate-900">
                {formatDuration(values[p.key].sec)}
              </span>{" "}
              <span className="text-xs text-slate-500">{values[p.key].pct}%</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">
        Of {formatDuration(share.availableSec)} available (working time minus breaks and meetings).
        Idle starts after 5 minutes without input, or at once when the screen is locked. It never
        changes focus time.
      </p>
    </div>
  );
}
