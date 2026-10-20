import type { IdleReason } from "@/features/tracking/types";

/** SPEC 2.5: the built-in reasons and their default labels. */
export const BUILT_IN_REASONS: IdleReason[] = [
  { key: "BREAK", label: "Took a break", kind: "BREAK", builtIn: true },
  { key: "THINKING", label: "Thinking", kind: "THINKING", builtIn: true },
  { key: "MEETING", label: "Short meeting", kind: "MEETING", builtIn: true },
  { key: "HARDWARE", label: "Working on hardware", kind: "HARDWARE", builtIn: true },
  { key: "OTHER", label: "Other work", kind: "OTHER", builtIn: true },
];

/** A department with no choice of its own offers these (HARDWARE is opt-in). */
export const DEFAULT_REASON_KEYS = ["BREAK", "THINKING", "MEETING", "OTHER"];

export const IDLE_MINUTES = { min: 2, max: 60, default: 5 } as const;
export const REASON_LABEL = { min: 2, max: 40 } as const;

/** What each kind asks the person in the away pop-up (SPEC 2.5 table). */
export const REASON_ASKS: Record<string, string> = {
  BREAK: "Nothing: it becomes a quick break from when they went away",
  THINKING: "A one-line thought; needs approval to count as focus",
  MEETING: "Participants, a summary and who mails the minutes; needs approval",
  HARDWARE: "What they worked on; needs approval",
  OTHER: "What they worked on; needs approval",
  CUSTOM: "What they worked on; needs approval",
};

export function validMinutes(value: string): number | null {
  const t = value.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= IDLE_MINUTES.min && n <= IDLE_MINUTES.max ? n : null;
}

/** Problems with a reasons list: labels 2..40 characters, no two alike. */
export function reasonProblems(reasons: IdleReason[]): Record<string, string> {
  const problems: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const r of reasons) {
    const label = r.label.trim();
    if (label.length < REASON_LABEL.min || label.length > REASON_LABEL.max) {
      problems[r.key] = `Use ${REASON_LABEL.min} to ${REASON_LABEL.max} characters.`;
      continue;
    }
    const norm = label.toLowerCase();
    if (seen.has(norm)) problems[r.key] = "Another reason already says this.";
    else seen.set(norm, r.key);
  }
  return problems;
}

/** A key for a new custom reason: short, stable, not a built-in's. */
export function customReasonKey(label: string, taken: string[]): string {
  const base =
    "CUSTOM_" +
    (label
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 24) || "REASON");
  let key = base;
  for (let i = 2; taken.includes(key); i++) key = `${base}_${i}`;
  return key;
}

/** Built-ins always present, in their order, with any rename kept; customs after. */
export function withBuiltIns(reasons: IdleReason[]): IdleReason[] {
  const byKey = new Map(reasons.map((r) => [r.key, r]));
  const builtIns = BUILT_IN_REASONS.map((b) => {
    const sent = byKey.get(b.key);
    return sent ? { ...b, label: sent.label || b.label } : b;
  });
  const customs = reasons.filter((r) => !BUILT_IN_REASONS.some((b) => b.key === r.key));
  return [...builtIns, ...customs.map((c) => ({ ...c, builtIn: false, kind: c.kind || "CUSTOM" }))];
}
