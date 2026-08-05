import type { DailyProductivity } from "@/features/productivity/types";

const SEGMENTS = [
  { key: "focusSec", label: "Focus Time", color: "rgb(34 34 204)" },
  { key: "meetingSec", label: "Meeting Time", color: "#a855f7" },
  { key: "idleSec", label: "Idle Time", color: "#cbd5e1" },
] as const;

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function ProductivityGauge({ data }: { data: DailyProductivity }) {
  const score = Math.max(0, Math.min(10, data.score));
  const fraction = score / 10;
  const total = data.focusSec + data.meetingSec + data.idleSec;

  const arc = "M 20 100 A 80 80 0 0 1 180 100";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative w-[200px] shrink-0">
        <svg viewBox="0 0 200 116" className="w-full">
          <defs>
            <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgb(34 34 204)" />
              <stop offset="60%" stopColor="#7c74e6" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>
          <path d={arc} fill="none" stroke="#e2e8f0" strokeWidth={16} strokeLinecap="round" />
          <path
            d={arc}
            fill="none"
            stroke="url(#gaugeFill)"
            strokeWidth={16}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${fraction} 1`}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            {score.toFixed(1)}
          </span>
          <span className="text-base font-medium text-slate-400"> / 10</span>
        </div>
      </div>

      <ul className="space-y-2">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">
              {pct(data[s.key], total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
