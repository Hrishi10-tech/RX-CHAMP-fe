import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { TOKENS, hex } from "./tokens";

// D-89: the portal names colours only through src/styles/tokens.ts.
const SRC = join(__dirname, "..");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
// Forward slashes, so the allow list reads the same on Windows.
const rel = (path: string) => relative(SRC, path).split(sep).join("/");
const sources = files(SRC).map((path) => ({ path: rel(path), text: readFileSync(path, "utf8") }));

// Literal colours that are not the portal's own: third-party app logos, the floating icon (a
// value-for-value copy of the agent's own painter, held by its tests).
const LITERAL_COLOURS_ALLOWED = new Set([
  "styles/tokens.ts",
  "features/analytics/lib/appIcons.tsx",
  "components/avatar/floatingIconGeometry.ts",
  "components/avatar/FloatingIcon.tsx",
]);

describe("design tokens", () => {
  it("no component uses Tailwind's own palette (it is not in the config any more)", () => {
    const palette =
      /(?<![\w-])(?:[a-z0-9:[\]-]+:)?(?:bg|text|border(?:-[trblxy])?|ring|divide|from|to|via|fill|stroke|outline|placeholder|accent|shadow|decoration)-(?:white|black|slate|gray|zinc|neutral-\d|emerald|green|teal|sky|blue|cyan|indigo|amber|yellow|orange|rose|red|pink|violet|purple)(?:-\d{2,3})?(?![\w-])/;
    const offenders = sources
      .filter((s) => palette.test(s.text))
      .map((s) => `${s.path}: ${palette.exec(s.text)?.[0]}`);
    expect(offenders).toEqual([]);
  });

  it("no component writes a colour literal; it uses a token", () => {
    const literal = /#[0-9a-fA-F]{6}\b|rgba?\(\s*\d/;
    const offenders = sources
      .filter((s) => !LITERAL_COLOURS_ALLOWED.has(s.path) && literal.test(s.text))
      .map((s) => `${s.path}: ${literal.exec(s.text)?.[0]}`);
    expect(offenders).toEqual([]);
  });

  it("there is no red token, on screen or on paper (attention is amber)", () => {
    const red = ([r, g, b]: readonly number[]) => r > 180 && g < 110 && b < 110;
    const reds = Object.entries(TOKENS).filter(
      ([, token]) => red(token.screen) || red(token.print),
    );
    expect(reds.map(([name]) => name)).toEqual([]);
  });

  it("the screen values are the agent's (Styles/Theme.axaml)", () => {
    expect(hex.panel).toBe("#1A2029");
    expect(hex.card).toBe("#222937");
    expect(hex.field).toBe("#12161D");
    expect(hex.fill).toBe("#2B3343");
    expect(hex.edge).toBe("#3A4356");
    expect(hex.primary).toBe("#E8EBF0");
    expect(hex.quiet).toBe("#9AA3B2");
    expect(hex.neutral).toBe("#8A93A3");
    expect(hex.brand).toBe("#6FC9B6");
    expect(hex["on-brand"]).toBe("#0E1B18");
    expect(hex.attention).toBe("#F2A93B");
    expect(hex.working).toBe("#34D27A");
    expect(hex.meeting).toBe("#A78BFA");
  });

  it("every printed surface is light and every printed text dark", () => {
    const light = (v: readonly number[]) => v.every((c) => c >= 220);
    for (const name of ["panel", "card", "field", "fill"] as const)
      expect(light(TOKENS[name].print)).toBe(true);
    for (const name of ["primary", "strong", "body", "soft", "quiet"] as const)
      expect(TOKENS[name].print.every((c) => c <= 140)).toBe(true);
  });

  // The owner's rule (W-35): no em dashes anywhere, on screen or in the code.
  it("no em dash in the portal's source", () => {
    const all = files(SRC).map((path) => ({ path: rel(path), text: readFileSync(path, "utf8") }));
    expect(all.filter((s) => s.text.includes("\u2014")).map((s) => s.path)).toEqual([]);
  });
});
