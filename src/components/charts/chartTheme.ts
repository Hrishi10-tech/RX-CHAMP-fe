import type { CSSProperties } from "react";

import { cssVar, type TokenName } from "@/styles/tokens";

/**
 * One look for every chart (D-89): grid and axes in the quiet neutrals, tooltips on the panel.
 * The values are CSS variables, which SVG attributes read too, so a chart is dark on screen and
 * light on paper with no override stylesheet (the old !important Recharts rules are gone).
 */
export const tokenColor = (name: TokenName, alpha?: number) =>
  alpha == null ? `rgb(var(${cssVar(name)}))` : `rgb(var(${cssVar(name)}) / ${alpha})`;

/** <CartesianGrid {...chartGrid} /> */
export const chartGrid = { stroke: tokenColor("chart-grid"), vertical: false } as const;

/** XAxis / YAxis tick text. */
export const axisTick = (fontSize = 11) => ({ fontSize, fill: tokenColor("chart-axis") });

/** An axis line, where a chart draws one. */
export const axisLine = { stroke: tokenColor("edge") } as const;

/** The hover band behind a bar. */
export const chartCursor = { fill: tokenColor("brand", 0.05) } as const;

/** Recharts' own tooltip, on the panel (the agent's surface for anything that floats). */
export const tooltipStyle: {
  contentStyle: CSSProperties;
  labelStyle: CSSProperties;
  itemStyle: CSSProperties;
} = {
  contentStyle: {
    borderRadius: 12,
    border: `1px solid ${tokenColor("edge")}`,
    background: tokenColor("panel"),
    color: tokenColor("primary"),
    fontSize: 13,
  },
  labelStyle: { color: tokenColor("primary") },
  itemStyle: { color: tokenColor("body") },
};
