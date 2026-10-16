import { liveFocusSec } from "@/features/workday/lib/focus";
import type { FocusView } from "@/features/workday/types";

/**
 * The team's focus time for the tile, in exact seconds (rounded once, when
 * shown, like every payroll total): the server's total, plus what each running
 * clock has added since it was read, so the tile keeps pace with the rows.
 */
export function teamFocusSec(
  totalSec: number,
  rows: { focus: Pick<FocusView, "focusSec" | "running"> | null | undefined }[],
  fetchedAt: number,
  now: number,
  live: boolean,
): number {
  const base = Number.isFinite(totalSec) ? Math.max(0, totalSec) : 0;
  if (!live) return base;
  const added = rows.reduce((sum, r) => {
    if (!r.focus?.running) return sum;
    return sum + liveFocusSec(r.focus, fetchedAt, now) - Math.max(0, r.focus.focusSec || 0);
  }, 0);
  return base + Math.max(0, added);
}
