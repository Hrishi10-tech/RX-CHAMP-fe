import { hex, type TokenName } from "@/styles/tokens";

import { DAY_CLASS, dayClassLook } from "./labels";

// D-89: colours are the tokens in src/styles/tokens.ts (was: the --tw-* channels in globals.css).
// A chart fill must equal the colour its swatch class paints on screen.
const tokenOf = (cell: string) => /^bg-([a-z-]+)$/.exec(cell)?.[1] as TokenName | undefined;

describe("one palette for day classes", () => {
  it.each(Object.entries(DAY_CLASS))(
    "%s: the chart fill is the same colour as the swatch class",
    (_dayClass, look) => {
      const token = tokenOf(look.cell);
      expect(token && hex[token]).toBe(look.fill);
    },
  );

  it("an unknown class still has a matching swatch and fill", () => {
    const look = dayClassLook("SOMETHING_NEW");
    expect(look.cell).toBe("bg-fill");
    expect(look.fill).toBe(hex.fill);
  });

  it("no two day classes share a colour", () => {
    const fills = Object.values(DAY_CLASS).map((l) => l.fill.toLowerCase());
    expect(new Set(fills).size).toBe(fills.length);
  });
});
