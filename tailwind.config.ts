import type { Config } from "tailwindcss";
// Imported rather than `require`d: this file uses `export default`, so Node loads it
// as ESM (native TS support, Node 22+), and `require` is not defined there.
import tailwindcssAnimate from "tailwindcss-animate";

import plugin from "tailwindcss/plugin";
import { TOKENS, cssVar, type TokenName } from "./src/styles/tokens";

/**
 * D-89: the portal's colours are the semantic tokens of src/styles/tokens.ts and nothing else.
 * Tailwind's own palette (slate, white, rose, sky, ...) is replaced, not extended, so a class can
 * only say what it means: bg-panel, bg-card, bg-field, bg-fill, text-primary, text-quiet,
 * border-card, bg-brand, text-on-brand, text-attention, bg-working, text-meeting, ...
 * Each token is a CSS variable with a screen value (the agent's dark design) and a print value
 * (paper stays light), written below by the plugin.
 */
const names = Object.keys(TOKENS) as TokenName[];
const color = (name: TokenName) => `rgb(var(${cssVar(name)}) / <alpha-value>)`;
const palette: Record<string, string> = {
  transparent: "transparent",
  current: "currentColor",
  inherit: "inherit",
  ...Object.fromEntries(names.map((name) => [name, color(name)])),
};

const rgb = (v: readonly number[]) => v.join(" ");
const tokenVariables = plugin(({ addBase }) => {
  addBase({
    ":root": Object.fromEntries(names.map((name) => [cssVar(name), rgb(TOKENS[name].screen)])),
    "@media print": {
      ":root": Object.fromEntries(names.map((name) => [cssVar(name), rgb(TOKENS[name].print)])),
    },
  });
});

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: palette,
    // border-card is the card's edge (the agent's CardBorder), border-surface the card colour.
    borderColor: ({ theme }) => ({
      ...theme("colors"),
      DEFAULT: color("edge"),
      card: color("edge"),
      surface: color("card"),
    }),
    // Tailwind falls back to blue for a bare ring and white for its offset: the brand and the card.
    ringColor: ({ theme }) => ({ ...theme("colors"), DEFAULT: color("brand") }),
    ringOffsetColor: ({ theme }) => ({ ...theme("colors"), DEFAULT: color("card") }),
    extend: {
      // Every whole percent, so a token's tint can be written as it was (bg-brand/6, ring-brand/14).
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)]),
      ),
      borderRadius: {
        xl: "calc(var(--radius) + 6px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // The agent draws in Inter (Avalonia.Fonts.Inter); the portal loads it in the root layout.
        sans: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate, tokenVariables],
};
export default config;
