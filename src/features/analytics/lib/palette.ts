import { hex } from "@/styles/tokens";
// Agent design: teal for work, violet for meetings, green for working now, amber for attention.
// Five distinct series, no red.
export const CAT = [hex.brand, hex.meeting, hex.working, hex.attention, hex.neutral] as const;

export const C = {
  indigo: hex.brand,
  violet: hex.meeting,
  teal: hex.brand,
  amber: hex.attention,
  slate: hex.neutral,
  green: hex.working,
  red: hex.attention,
  grid: hex["chart-grid"],
  axis: hex["chart-axis"],
  track: hex.edge,
} as const;

export const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: `1px solid ${hex.edge}`,
  background: hex.panel,
  color: hex.primary,
  fontSize: 13,
} as const;
