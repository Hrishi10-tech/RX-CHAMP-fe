import {
  ADJUSTMENT_MAX_AGE_DAYS,
  ADJUSTMENT_MAX_MIN,
  ADJUSTMENT_REASON_MAX_CHARS,
  ADJUSTMENT_REASON_MIN_CHARS,
} from "@/features/adjustments/types";
import { addDaysToKey } from "@/lib/time/businessTime";

export type Direction = "ADD" | "TAKE_OFF";

export interface AdjustmentDraft {
  direction: Direction;
  /** What the person typed or picked; "" while empty. */
  minutes: string;
  date: string;
  reason: string;
}

export interface DraftProblems {
  minutes?: string;
  date?: string;
  reason?: string;
}

/** The server's rules, applied before the request so the form can say why. */
export function checkDraft(d: AdjustmentDraft, today: string): DraftProblems {
  const problems: DraftProblems = {};
  const minutes = Number(d.minutes);
  if (!d.minutes.trim() || !Number.isInteger(minutes) || minutes <= 0) {
    problems.minutes = "Whole minutes, at least 1.";
  } else if (minutes > ADJUSTMENT_MAX_MIN) {
    problems.minutes = `At most ${ADJUSTMENT_MAX_MIN} minutes (12 hours) in one adjustment.`;
  }
  if (!d.date) problems.date = "Pick the day.";
  else if (d.date > today) problems.date = "That day has not happened yet.";
  else if (d.date < addDaysToKey(today, -ADJUSTMENT_MAX_AGE_DAYS)) {
    problems.date = `Adjustments reach back ${ADJUSTMENT_MAX_AGE_DAYS} days at most.`;
  }
  const reason = d.reason.trim().replace(/\s+/g, " ");
  if (reason.length < ADJUSTMENT_REASON_MIN_CHARS) {
    problems.reason = `Say why, in at least ${ADJUSTMENT_REASON_MIN_CHARS} characters. The person sees it.`;
  } else if (reason.length > ADJUSTMENT_REASON_MAX_CHARS) {
    problems.reason = `Keep it under ${ADJUSTMENT_REASON_MAX_CHARS} characters.`;
  }
  return problems;
}

/** The signed minutes the API takes. */
export function signedMinutes(d: Pick<AdjustmentDraft, "direction" | "minutes">): number {
  const n = Math.round(Number(d.minutes) || 0);
  return d.direction === "TAKE_OFF" ? -n : n;
}

/** "+30 min" / "−1 h 30 min", for the preview and the lists. */
export function signedLabel(deltaMin: number): string {
  const abs = Math.abs(deltaMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const text = h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
  return `${deltaMin < 0 ? "−" : "+"}${text}`;
}
