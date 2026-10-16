import type { ChipTone } from "@/components/ui/Chip";
import type { DayClass, TimelineKind } from "@/features/reports/types";

/**
 * Attendance words and colours for a day class: the one palette for day classes
 * on every page. `cell` (a Tailwind class, for swatches and HTML bars) and
 * `fill` (the same colour, for SVG charts) must stay the same colour; a test
 * checks them against Tailwind's palette.
 */
export const DAY_CLASS: Record<
  DayClass,
  { label: string; short: string; tone: ChipTone; cell: string; fill: string }
> = {
  FULL: {
    label: "Full day",
    short: "Full",
    tone: "success",
    cell: "bg-emerald-500",
    fill: "#10b981",
  },
  HALF: {
    label: "Half day",
    short: "Half",
    tone: "warning",
    cell: "bg-amber-400",
    fill: "#fbbf24",
  },
  ABSENT: {
    label: "Absent",
    short: "Absent",
    tone: "danger",
    cell: "bg-rose-400",
    fill: "#fb7185",
  },
  OFF: { label: "Day off", short: "Off", tone: "neutral", cell: "bg-slate-200", fill: "#e2e8f0" },
  EXTRA: {
    label: "Extra day",
    short: "Extra",
    tone: "brand",
    cell: "bg-indigo-500",
    fill: "#6366f1",
  },
  IN_PROGRESS: {
    label: "In progress",
    short: "Today",
    tone: "info",
    cell: "bg-sky-400",
    fill: "#38bdf8",
  },
  UPCOMING: {
    label: "Upcoming",
    short: "Later",
    tone: "neutral",
    cell: "bg-slate-100",
    fill: "#f1f5f9",
  },
};

export function dayClassLook(dayClass: string) {
  return (
    (DAY_CLASS as Record<string, (typeof DAY_CLASS)[DayClass]>)[dayClass] ?? {
      label: dayClass,
      short: dayClass,
      tone: "neutral" as ChipTone,
      cell: "bg-slate-100",
      fill: "#f1f5f9",
    }
  );
}

/** Timeline segment colours, matching the legend. */
export const TIMELINE: Record<TimelineKind, { label: string; bar: string; swatch: string }> = {
  WORK: { label: "Focus", bar: "bg-indigo-600", swatch: "bg-indigo-600" },
  MEETING: {
    label: "Meeting, counted as focus",
    bar: "bg-[repeating-linear-gradient(45deg,rgb(79_70_229)_0_4px,rgb(165_180_252)_4px_7px)]",
    swatch: "bg-[repeating-linear-gradient(45deg,rgb(79_70_229)_0_3px,rgb(165_180_252)_3px_5px)]",
  },
  BREAK: { label: "Break", bar: "bg-teal-500", swatch: "bg-teal-500" },
  LUNCH: { label: "Lunch", bar: "bg-teal-700", swatch: "bg-teal-700" },
  OFF: { label: "Not working", bar: "bg-slate-200", swatch: "bg-slate-200" },
};

export function timelineLook(kind: string) {
  return (
    (TIMELINE as Record<string, (typeof TIMELINE)[TimelineKind]>)[kind] ?? {
      label: kind,
      bar: "bg-slate-300",
      swatch: "bg-slate-300",
    }
  );
}

/** Heatmap shades for active minutes in an hour. */
export function heatShade(activeMin: number): string {
  if (activeMin >= 45) return "bg-indigo-800";
  if (activeMin >= 30) return "bg-indigo-500";
  if (activeMin >= 15) return "bg-indigo-300";
  if (activeMin > 0) return "bg-indigo-100";
  return "bg-slate-50";
}

export const HEAT_LEGEND = [
  { shade: "bg-indigo-100", label: "under 15" },
  { shade: "bg-indigo-300", label: "15 to 29" },
  { shade: "bg-indigo-500", label: "30 to 44" },
  { shade: "bg-indigo-800", label: "45 or more" },
];
