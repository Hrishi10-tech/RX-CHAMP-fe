/**
 * The agent's floating icon, measured at its real size of 56 px (design pages 1 and 2,
 * brief 1.1). Everything scales from these numbers, so the desktop agent and the phone
 * can reproduce the same drawing.
 */
export const ICON_SIZE = 56;
export const ICON_CENTER = ICON_SIZE / 2;
export const BEZEL_RADIUS = ICON_SIZE / 2;
export const AVATAR_DIAMETER = 42;
/** The middle of the ring's stroke. */
export const RING_RADIUS = 25;
export const RING_STROKE = 2;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** The ring starts at the status dot, at the bottom right, and fills clockwise back to it. */
export const RING_START_DEG = 45;
export const DOT_DIAMETER = 7;
export const DOT_EDGE = 1;
export const TRACK_OPACITY = 0.09;
/** The badge's light circle; with its dark edge it is 14 across (design page 5). */
export const BADGE_DIAMETER = 12;
export const BADGE_EDGE = 1;
/** A count past nine: the light part is a pill this wide, same height, same centre. */
export const BADGE_PILL_WIDTH = 15;
export const BADGE_GLYPH_SIZE = 7.5;
/** A capital's height in ems: Segoe UI 0.70, San Francisco 0.71, Arial 0.72. */
export const BADGE_GLYPH_CAP_HEIGHT = 0.71;

export const ICON_COLORS = {
  working: "#34D27A",
  workingRing: "#6FC9B6",
  meeting: "#A78BFA",
  onBreak: "#F2A93B",
  hollowDot: "#8A93A3",
  targetReached: "#34D27A",
  dotEdge: "#0E1116",
  track: "#FFFFFF",
  badge: "#E8EBF0",
  badgeEdge: "#141920",
  badgeGlyph: "#141920",
} as const;

export type FloatingIconStatus = "NOT_STARTED" | "WORKING" | "MEETING" | "BREAK" | "ENDED";

export interface IconAppearance {
  /** The dot's fill; null for the hollow grey dot of Not started and Day ended. */
  dotFill: string | null;
  ringColor: string;
  ringOpacity: number;
  /** Length of the filled arc along the ring; 0 draws nothing. */
  arcLength: number;
}

/** A point on the ring's path; `deg` runs clockwise from three o'clock. */
export function pointOnRing(deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: ICON_CENTER + RING_RADIUS * Math.cos(rad),
    y: ICON_CENTER + RING_RADIUS * Math.sin(rad),
  };
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

const DOT_FILL: Record<FloatingIconStatus, string | null> = {
  NOT_STARTED: null,
  WORKING: ICON_COLORS.working,
  MEETING: ICON_COLORS.meeting,
  BREAK: ICON_COLORS.onBreak,
  ENDED: null,
};

/** The design's vector data (D-74); the brief itself names only 36% and 30%. */
const RING_OPACITY: Record<FloatingIconStatus, number> = {
  NOT_STARTED: 1,
  WORKING: 0.9,
  MEETING: 0.9,
  BREAK: 0.36,
  ENDED: 0.3,
};
const TARGET_REACHED_RING_OPACITY = 0.95;

/**
 * What each state looks like. Reaching the target turns the ring green while working and on
 * a break, with the dot still saying what the person is doing. A meeting stays purple until
 * it ends and a day ended stays teal at 30%, as in the design (pages 1, 3, 4) and AGENT.md.
 * Only working past the target takes the brighter ring: the status goes first (D-33).
 */
export function iconAppearance(status: FloatingIconStatus, progress: number): IconAppearance {
  const filled = status === "NOT_STARTED" ? 0 : clampProgress(progress);
  const reached = filled >= 1;
  let ringColor: string = status === "MEETING" ? ICON_COLORS.meeting : ICON_COLORS.workingRing;
  if (reached && status !== "MEETING" && status !== "ENDED") {
    ringColor = ICON_COLORS.targetReached;
  }
  return {
    dotFill: DOT_FILL[status],
    ringColor,
    ringOpacity:
      reached && status === "WORKING" ? TARGET_REACHED_RING_OPACITY : RING_OPACITY[status],
    arcLength: filled * RING_CIRCUMFERENCE,
  };
}
