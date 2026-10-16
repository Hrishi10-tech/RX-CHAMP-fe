import colors from "tailwindcss/colors";

import { DAY_CLASS, dayClassLook } from "./labels";

const palette = colors as unknown as Record<string, Record<string, string>>;

describe("one palette for day classes", () => {
  it.each(Object.entries(DAY_CLASS))(
    "%s: the chart fill is the same colour as the swatch class",
    (_dayClass, look) => {
      const [, name, shade] = /^bg-([a-z]+)-(\d+)$/.exec(look.cell) ?? [];
      expect(look.fill.toLowerCase()).toBe(palette[name]?.[shade]);
    },
  );

  it("an unknown class still has a matching swatch and fill", () => {
    const look = dayClassLook("SOMETHING_NEW");
    expect(look.cell).toBe("bg-slate-100");
    expect(look.fill).toBe(palette.slate["100"]);
  });
});
