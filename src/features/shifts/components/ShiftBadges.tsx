import { Chip } from "@/components/ui/Chip";
import { SOURCE_LABEL, SOURCE_TONE } from "@/features/breaks/lib/labels";
import { formatHmRange } from "@/features/shifts/lib/time";
import type { ShiftBreakView, ShiftRef, ShiftSource } from "@/features/shifts/types";

export function DefaultBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-[rgba(34,34,204,0.1)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[rgb(34_34_204)]">
      Default
    </span>
  );
}

/** "General · 09:30–18:30", or a fallback when there is no shift. */
export function shiftRefLabel(shift: ShiftRef | null, fallback = "No shift"): string {
  return shift ? `${shift.name} · ${formatHmRange(shift.start, shift.end)}` : fallback;
}

export function SourceChip({ source, title }: { source: ShiftSource; title?: string }) {
  return (
    <Chip tone={SOURCE_TONE[source]} title={title}>
      {SOURCE_LABEL[source]}
    </Chip>
  );
}

/** One break of a shift, as listed on the Shifts page. Stacked, so table columns stay narrow. */
export function BreakSummary({ brk }: { brk: ShiftBreakView | undefined }) {
  if (!brk || !brk.enabled) {
    return <Chip tone="neutral">Off</Chip>;
  }
  return (
    <div className="min-w-0 text-xs text-slate-500">
      <p className="text-sm font-semibold tabular-nums text-slate-900">
        <span className="whitespace-nowrap">{formatHmRange(brk.startTime, brk.endTime)}</span>{" "}
        <span className="whitespace-nowrap font-normal text-slate-500">{brk.durationMin} min</span>
      </p>
      <p className="whitespace-nowrap tabular-nums">
        Can start {formatHmRange(brk.windowOpen, brk.windowClose)}
      </p>
    </div>
  );
}
