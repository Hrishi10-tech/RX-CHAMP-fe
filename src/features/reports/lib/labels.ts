import type { ChipTone } from "@/components/ui/Chip";
import type { DayClass, TimelineKind } from "@/features/reports/types";
import { hex } from "@/styles/tokens";

/**
 * Attendance words and colours for a day class: the one palette for day classes
 * on every page. `cell` (a Tailwind class, for swatches and HTML bars) and
 * `fill` (the same colour, for SVG charts) are the same token (src/styles/tokens.ts); a test
 * holds them together.
 */
export const DAY_CLASS: Record<
  DayClass,
  { label: string; short: string; tone: ChipTone; cell: string; fill: string }
> = {
  FULL: {
    label: "Full day",
    short: "Full",
    tone: "success",
    cell: "bg-working",
    fill: hex.working,
  },
  HALF: {
    label: "Half day",
    short: "Half",
    tone: "warning",
    cell: "bg-attention-edge-strong",
    fill: hex["attention-edge-strong"],
  },
  ABSENT: {
    label: "Absent",
    short: "Absent",
    tone: "danger",
    cell: "bg-attention",
    fill: hex.attention,
  },
  OFF: { label: "Day off", short: "Off", tone: "neutral", cell: "bg-edge", fill: hex.edge },
  EXTRA: {
    label: "Extra day",
    short: "Extra",
    tone: "brand",
    cell: "bg-brand",
    fill: hex.brand,
  },
  LEAVE: {
    label: "On leave",
    short: "Leave",
    tone: "violet",
    cell: "bg-meeting",
    fill: hex.meeting,
  },
  IN_PROGRESS: {
    label: "In progress",
    short: "Today",
    tone: "info",
    cell: "bg-brand-edge-strong",
    fill: hex["brand-edge-strong"],
  },
  UPCOMING: {
    label: "Upcoming",
    short: "Later",
    tone: "neutral",
    cell: "bg-fill",
    fill: hex.fill,
  },
};

export function dayClassLook(dayClass: string) {
  return (
    (DAY_CLASS as Record<string, (typeof DAY_CLASS)[DayClass]>)[dayClass] ?? {
      label: dayClass,
      short: dayClass,
      tone: "neutral" as ChipTone,
      cell: "bg-fill",
      fill: hex.fill,
    }
  );
}

/** Timeline segment colours, matching the legend. */
export const TIMELINE: Record<TimelineKind, { label: string; bar: string; swatch: string }> = {
  WORK: { label: "Focus", bar: "bg-brand", swatch: "bg-brand" },
  MEETING: {
    label: "Meeting, counted as focus",
    bar: "bg-[repeating-linear-gradient(45deg,rgb(var(--c-meeting))_0_4px,rgb(var(--c-meeting-edge-strong))_4px_7px)]",
    swatch:
      "bg-[repeating-linear-gradient(45deg,rgb(var(--c-meeting))_0_3px,rgb(var(--c-meeting-edge-strong))_3px_5px)]",
  },
  BREAK: { label: "Break", bar: "bg-attention", swatch: "bg-attention" },
  LUNCH: { label: "Lunch", bar: "bg-attention-edge-strong", swatch: "bg-attention-edge-strong" },
  OFF: { label: "Not working", bar: "bg-edge", swatch: "bg-edge" },
};

export function timelineLook(kind: string) {
  return (
    (TIMELINE as Record<string, (typeof TIMELINE)[TimelineKind]>)[kind] ?? {
      label: kind,
      bar: "bg-edge-strong",
      swatch: "bg-edge-strong",
    }
  );
}

/** Heatmap shades for active minutes in an hour. */
export function heatShade(activeMin: number): string {
  if (activeMin >= 45) return "bg-brand-hover";
  if (activeMin >= 30) return "bg-brand";
  if (activeMin >= 15) return "bg-brand-edge-strong";
  if (activeMin > 0) return "bg-brand-wash-strong";
  return "bg-fill";
}

export const HEAT_LEGEND = [
  { shade: "bg-brand-wash-strong", label: "under 15" },
  { shade: "bg-brand-edge-strong", label: "15 to 29" },
  { shade: "bg-brand", label: "30 to 44" },
  { shade: "bg-brand-hover", label: "45 or more" },
];
