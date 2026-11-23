import { Chip } from "@/components/ui/Chip";
import { formatDay } from "@/lib/time/businessTime";
import {
  PAYROLL_PAUSED_LABEL,
  figureText,
  pausedDaysText,
  type TimeFigure,
} from "@/features/reports/lib/timeFigures";
import type { PersonPayroll } from "@/features/reports/types";

/**
 * Working, focus, idle, break and meeting time side by side (brief 1.8). Wraps to three
 * and two on a phone. `compact` is for a row of a list; the default is a card of its own.
 * 4.0: idle is keyboard and mouse activity, so a viewer without the activity grant
 * (`showIdle` false) sees the other four.
 */
export function TimeFigures({
  figures,
  compact = false,
  showIdle = true,
}: {
  figures: TimeFigure[];
  compact?: boolean;
  showIdle?: boolean;
}) {
  const shown = showIdle ? figures : figures.filter((f) => f.label !== "Idle");
  const cols = shown.length === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4";
  return (
    <dl
      aria-label={
        showIdle
          ? "Working, focus, idle, break and meeting time"
          : "Working, focus, break and meeting time"
      }
      className={
        compact
          ? `grid grid-cols-3 gap-x-3 gap-y-1.5 ${cols}`
          : `grid grid-cols-3 gap-x-4 gap-y-3 rounded-2xl border border-card bg-card p-4 shadow-sm ${cols} print:shadow-none`
      }
    >
      {shown.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt
            className={
              compact
                ? "text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet"
                : "text-[0.8125rem] font-semibold text-soft"
            }
          >
            {f.label}
          </dt>
          <dd
            className={`tabular-nums ${
              f.sec === null
                ? "text-xs text-quiet"
                : compact
                  ? "text-sm font-semibold text-primary"
                  : "text-xl font-bold tracking-tight text-primary"
            }`}
          >
            {figureText(f.sec)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The label on a person's row wherever their payroll would appear (brief 1.6). */
export function PayrollPausedChip({ label }: { label?: string }) {
  return (
    <Chip tone="neutral" wrap>
      {label ?? PAYROLL_PAUSED_LABEL}
    </Chip>
  );
}

/**
 * The label on a person's row of a month. Someone back in payroll keeps it for the days left
 * out, and says which, so the row does not read as if nothing had resumed. Those days need not
 * be one stretch, hence "between".
 */
export function PayrollStanding({ payroll }: { payroll: PersonPayroll }) {
  const days = pausedDaysText(payroll.pausedDays);
  const from = formatDay(payroll.pausedFrom);
  const to = formatDay(payroll.pausedTo);
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <PayrollPausedChip label={payroll.label} />
      {!payroll.paused && (
        <span className="text-xs text-quiet">
          {payroll.pausedFrom === payroll.pausedTo
            ? `${days} left out, ${from}`
            : `${days} left out, between ${from} and ${to}`}
        </span>
      )}
    </span>
  );
}
