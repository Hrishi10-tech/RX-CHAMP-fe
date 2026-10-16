/** ISO weekdays, as the API stores them: 1 = Monday ... 7 = Sunday. */
export const WEEKDAYS: { iso: number; short: string; long: string }[] = [
  { iso: 1, short: "Mon", long: "Monday" },
  { iso: 2, short: "Tue", long: "Tuesday" },
  { iso: 3, short: "Wed", long: "Wednesday" },
  { iso: 4, short: "Thu", long: "Thursday" },
  { iso: 5, short: "Fri", long: "Friday" },
  { iso: 6, short: "Sat", long: "Saturday" },
  { iso: 7, short: "Sun", long: "Sunday" },
];

const SHORT = new Map(WEEKDAYS.map((d) => [d.iso, d.short]));

/**
 * Working days in a few words: "Every day", "Mon–Fri", "Mon–Sat", "Mon, Wed, Fri",
 * "Mon–Thu, Sat". Runs of three or more consecutive days collapse into a range.
 */
export function formatWorkDays(days: number[]): string {
  const sorted = [...new Set(days)].filter((d) => SHORT.has(d)).sort((a, b) => a - b);
  if (sorted.length === 0) return "No days";
  if (sorted.length === 7) return "Every day";

  const runs: number[][] = [];
  for (const d of sorted) {
    const run = runs[runs.length - 1];
    if (run && d === run[run.length - 1] + 1) run.push(d);
    else runs.push([d]);
  }

  return runs
    .flatMap((run) =>
      run.length >= 3
        ? [`${SHORT.get(run[0])}–${SHORT.get(run[run.length - 1])}`]
        : run.map((d) => SHORT.get(d) as string),
    )
    .join(", ");
}

/** Toggles one weekday in a list, keeping it sorted. */
export function toggleWorkDay(days: number[], iso: number): number[] {
  return days.includes(iso) ? days.filter((d) => d !== iso) : [...days, iso].sort((a, b) => a - b);
}
