/**
 * The portal's design tokens: the desktop agent's palette (agent/src/RXVision.Agent/Styles/Theme.axaml),
 * one name per meaning (D-88, rebuilt in D-89).
 *
 * Each token has its screen value (the agent's dark design) and its print value (paper stays light).
 * `tailwind.config.ts` turns them into CSS variables and Tailwind colours (bg-card, text-quiet,
 * border-card, bg-brand, text-on-brand, text-attention, ...); charts and SVG read `hex` from here.
 * Nothing else in the portal names a colour. There is no red: attention is amber.
 */

type Rgb = readonly [number, number, number];
export type Token = { readonly screen: Rgb; readonly print: Rgb };

const t = (screen: Rgb, print: Rgb): Token => ({ screen, print });

export const TOKENS = {
  // ---- Surfaces ---------------------------------------------------------------------------
  /** The page and the sidebar, behind the cards; dialogs and sheets. Agent Panel #1A2029. */
  panel: t([26, 32, 41], [241, 245, 249]),
  /** Every card, table and menu. Agent Card #222937. */
  card: t([34, 41, 55], [255, 255, 255]),
  /** Text fields, pickers, the tab well, figure tiles. Agent Field #12161D. */
  field: t([18, 22, 29], [255, 255, 255]),
  /** The chosen tab and nav item, secondary buttons, quiet rows. Agent NeutralFill #2B3343. */
  fill: t([43, 51, 67], [248, 250, 252]),
  /** Card and field edges, dividers, bar tracks. Agent CardBorder #3A4356. */
  edge: t([58, 67, 86], [226, 232, 240]),
  /** A stronger edge: hover edges, empty dots, off switches. */
  "edge-strong": t([74, 84, 104], [203, 213, 225]),
  /** Lines between rows inside a card: the panel colour, so they read as gaps. */
  divider: t([26, 32, 41], [241, 245, 249]),
  /** Behind a dialog or an image viewer. Agent Scrim. */
  scrim: t([11, 14, 19], [0, 0, 0]),

  // ---- Text ---------------------------------------------------------------------------------
  /** Titles and values. Agent Text #E8EBF0. */
  primary: t([232, 235, 240], [15, 23, 42]),
  /** Strong body text, one step under the titles. */
  strong: t([221, 225, 232], [30, 41, 59]),
  /** Body text in tables and lists. */
  body: t([205, 211, 220], [51, 65, 85]),
  /** Secondary values and labels. */
  soft: t([180, 188, 200], [71, 85, 105]),
  /** Body copy, captions, hints. Agent TextQuiet #9AA3B2 (the lightest text, D-87). */
  quiet: t([154, 163, 178], [100, 116, 139]),
  /** Icons, axis labels, placeholders. Agent Neutral #8A93A3. */
  neutral: t([138, 147, 163], [148, 163, 184]),
  /** Faint marks: disabled glyphs, empty states. */
  faint: t([74, 84, 104], [203, 213, 225]),

  // ---- Brand teal ---------------------------------------------------------------------------
  /** The one filled button, links, focus, progress. Agent Brand #6FC9B6 (prints indigo). */
  brand: t([111, 201, 182], [34, 34, 204]),
  /** A filled teal button on hover. Agent BrandHover #82D3C2. */
  "brand-hover": t([130, 211, 194], [28, 28, 180]),
  /** Text and icons on teal. Agent BrandLabel #0E1B18. */
  "on-brand": t([14, 27, 24], [255, 255, 255]),
  /** Teal text on a teal wash. */
  "brand-ink": t([157, 218, 205], [49, 46, 129]),
  /** A teal-tinted surface (chosen chip, Now pill). */
  "brand-wash": t([42, 57, 68], [238, 242, 255]),
  "brand-wash-strong": t([46, 67, 75], [224, 231, 255]),
  "brand-edge": t([59, 92, 96], [199, 210, 254]),
  "brand-edge-strong": t([76, 129, 125], [165, 180, 252]),

  // ---- Attention amber (no red anywhere) ------------------------------------------------------
  /** Late, absent, overdue, delete: anything that needs a look. Agent Amber #F2A93B. */
  attention: t([242, 169, 59], [217, 119, 6]),
  /** An amber button on hover. */
  "attention-hover": t([217, 149, 47], [180, 83, 9]),
  /** Amber text on an amber wash. */
  "attention-ink": t([246, 197, 122], [120, 53, 15]),
  "attention-wash": t([55, 54, 55], [255, 251, 235]),
  "attention-wash-strong": t([67, 61, 56], [254, 243, 199]),
  "attention-edge": t([101, 82, 56], [253, 230, 138]),
  "attention-edge-strong": t([148, 111, 57], [252, 211, 77]),

  // ---- Working green ------------------------------------------------------------------------
  /** Working now, full day, approved. Agent Working #34D27A. */
  working: t([52, 210, 122], [5, 150, 105]),
  "working-ink": t([117, 224, 165], [6, 78, 59]),
  "working-wash": t([36, 58, 62], [236, 253, 245]),
  "working-wash-strong": t([37, 68, 66], [209, 250, 229]),
  "working-edge": t([40, 95, 76], [167, 243, 208]),

  // ---- Meeting violet -----------------------------------------------------------------------
  /** Meetings and leave. Agent Meeting #A78BFA. */
  meeting: t([167, 139, 250], [124, 58, 237]),
  "meeting-ink": t([195, 176, 252], [76, 29, 149]),
  "meeting-wash": t([47, 51, 74], [245, 243, 255]),
  "meeting-wash-strong": t([55, 57, 86], [237, 233, 254]),
  "meeting-edge": t([77, 72, 117], [221, 214, 254]),
  /** The darker stripe of a meeting bar. */
  "meeting-edge-strong": t([107, 95, 162], [196, 181, 253]),

  /** A light plate, where something is shown as it looks on white (the avatar preview's light tile). */
  paper: t([238, 240, 244], [238, 240, 244]),

  // ---- Charts ---------------------------------------------------------------------------------
  /** Chart grid lines: the neutral fill on screen, a pale line on paper. */
  "chart-grid": t([43, 51, 67], [238, 242, 246]),
  /** Chart axis labels: the agent Neutral on screen, slate on paper. */
  "chart-axis": t([138, 147, 163], [100, 116, 139]),
} as const satisfies Record<string, Token>;

export type TokenName = keyof typeof TOKENS;

const hexOf = ([r, g, b]: Rgb) =>
  `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

/** Screen values as hex, for SVG and charts (which cannot read CSS variables in attributes). */
export const hex = Object.fromEntries(
  Object.entries(TOKENS).map(([name, token]) => [name, hexOf(token.screen)]),
) as { readonly [K in TokenName]: string };

/** The CSS variable a token lives in: `--c-<name>`, as "r g b" so Tailwind can add alpha. */
export const cssVar = (name: TokenName) => `--c-${name}`;
