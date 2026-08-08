import type { DailyFlowCell } from "@/features/analytics/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_TICKS: Record<number, string> = {
  0: "12 AM",
  3: "3 AM",
  6: "6 AM",
  9: "9 AM",
  12: "12 PM",
  15: "3 PM",
  18: "6 PM",
  21: "9 PM",
};

function cellColor(value: number): string {
  if (value < 0.04) return "#f1f5f9";
  return `rgba(79, 70, 229, ${(0.12 + value * 0.88).toFixed(3)})`;
}

export function DailyFlowHeatmap({
  data,
  days,
}: {
  data: DailyFlowCell[];
  /** Monday-based weekday rows to draw. Defaults to the whole week; a single-day
   *  report passes just that day so six empty rows aren't printed. */
  days?: number[];
}) {
  const byKey = new Map(data.map((c) => [`${c.day}-${c.hour}`, c.value]));
  const rows = days ?? DAYS.map((_, i) => i);

  return (
    <div>
      <div className="space-y-1">
        {rows.map((day) => {
          const label = DAYS[day] ?? "";
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-[11px] font-medium text-slate-400">{label}</span>
              <div
                className="grid flex-1 gap-1"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {Array.from({ length: 24 }, (_, hour) => {
                  const v = byKey.get(`${day}-${hour}`) ?? 0;
                  return (
                    <div
                      key={hour}
                      className="aspect-square rounded-[3px]"
                      style={{ backgroundColor: cellColor(v) }}
                      title={`${label} ${hour}:00 — ${Math.round(v * 100)}%`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="w-8 shrink-0" />
        <div className="grid flex-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="text-[9px] text-slate-400">
              {HOUR_TICKS[hour] ?? ""}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-slate-400">
        <span>Low</span>
        <span
          className="h-2.5 w-24 rounded-full"
          style={{
            background: "linear-gradient(to right, #f1f5f9, rgba(79,70,229,0.5), #4f46e5)",
          }}
        />
        <span>High</span>
      </div>
    </div>
  );
}
