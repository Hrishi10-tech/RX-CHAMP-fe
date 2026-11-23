import { act, fireEvent, render } from "@testing-library/react";
import axios from "axios";

import { refreshAccessToken } from "@/lib/api";

import { FloatingIcon, type FloatingIconProps } from "./FloatingIcon";
import {
  ICON_COLORS,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  iconAppearance,
  type FloatingIconStatus,
} from "./floatingIconGeometry";

function draw(props: Partial<FloatingIconProps> = {}) {
  const { container } = render(<FloatingIcon status="WORKING" progress={0.5} {...props} />);
  const svg = container.querySelector("svg")!;
  const part = (name: string) => svg.querySelector(`[data-part="${name}"]`);
  const attr = (name: string, key: string) => part(name)?.getAttribute(key) ?? null;
  return { svg, part, attr };
}

const num = (value: string | null) => Number(value);

describe("FloatingIcon geometry at its real size of 56", () => {
  it("is 56 px by default, drawn on a 56 unit box", () => {
    const { svg } = draw();
    expect(svg.getAttribute("width")).toBe("56");
    expect(svg.getAttribute("height")).toBe("56");
    expect(svg.getAttribute("viewBox")).toBe("0 0 56 56");
  });

  it("scales proportionally: only the rendered size changes", () => {
    const { svg, attr } = draw({ size: 160 });
    expect(svg.getAttribute("width")).toBe("160");
    expect(svg.getAttribute("viewBox")).toBe("0 0 56 56");
    expect(attr("ring", "stroke-width")).toBe("2");
  });

  it("has a 42 px avatar circle", () => {
    const { attr } = draw({ imageUrl: "/a.webp" });
    expect(num(attr("avatar", "width"))).toBe(42);
    expect(num(attr("avatar", "height"))).toBe(42);
    expect(num(attr("avatar", "x"))).toBe(7);
    expect(num(attr("avatar", "y"))).toBe(7);
  });

  it("has a 2 px ring over a full circle track of white at 9%", () => {
    const { attr } = draw();
    expect(attr("ring", "stroke-width")).toBe("2");
    expect(attr("track", "stroke-width")).toBe("2");
    expect(attr("track", "stroke")).toBe("#FFFFFF");
    expect(attr("track", "stroke-opacity")).toBe("0.09");
    expect(attr("track", "stroke-dasharray")).toBeNull();
    expect(attr("track", "r")).toBe(attr("ring", "r"));
  });

  it("starts the ring at the dot and fills clockwise from there", () => {
    const { attr } = draw();
    // An SVG circle's stroke starts at three o'clock and runs clockwise; rotated 45 degrees,
    // that start is the bottom right, where the dot sits.
    expect(attr("ring", "transform")).toBe("rotate(45 28 28)");
    const x = num(attr("dot", "cx")) - 28;
    const y = num(attr("dot", "cy")) - 28;
    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);
    expect((Math.atan2(y, x) * 180) / Math.PI).toBeCloseTo(45, 6);
  });

  it("sits the dot on the ring's path", () => {
    const { attr } = draw();
    const distance = Math.hypot(num(attr("dot", "cx")) - 28, num(attr("dot", "cy")) - 28);
    expect(distance).toBeCloseTo(RING_RADIUS, 6);
  });

  it("gives the dot a 7 px diameter and a dark 1 px edge", () => {
    const { attr } = draw();
    expect(num(attr("dot", "r")) * 2).toBe(7);
    expect(num(attr("dot-edge", "r")) * 2).toBe(9);
    expect(attr("dot-edge", "fill")).toBe(ICON_COLORS.dotEdge);
  });

  it("keeps the hollow dot's outer size at 7 px too", () => {
    const { attr } = draw({ status: "NOT_STARTED" });
    const outer = num(attr("dot", "r")) * 2 + num(attr("dot", "stroke-width"));
    expect(outer).toBeCloseTo(7, 6);
  });

  it.each(["NOT_STARTED", "ENDED"] as const)(
    "%s draws the hollow dot as a 1 px #8A93A3 outline with no fill",
    (status) => {
      const { attr } = draw({ status, progress: 0.5 });
      expect(attr("dot", "stroke-width")).toBe("1");
      expect(attr("dot", "r")).toBe("3");
      expect(attr("dot", "stroke")).toBe("#8A93A3");
      expect(attr("dot", "fill")).toBe("none");
    },
  );

  it("scales the hollow dot's outline with the icon: it is drawn in the 56 unit box", () => {
    const { svg, attr } = draw({ status: "ENDED", progress: 0.5, size: 112 });
    expect(svg.getAttribute("width")).toBe("112");
    expect(svg.getAttribute("viewBox")).toBe("0 0 56 56");
    expect(attr("dot", "stroke-width")).toBe("1");
    expect(attr("dot", "vector-effect")).toBeNull();
  });

  it.each([
    [0.25, 0.25],
    [0.5, 0.5],
    [0.72, 0.72],
    [1, 1],
    [1.4, 1],
    [-1, 0],
  ])("fills %s of the circle as an arc of %s", (progress, share) => {
    const look = iconAppearance("WORKING", progress);
    expect(look.arcLength).toBeCloseTo(share * RING_CIRCUMFERENCE, 6);
  });

  it("draws that arc with a dash the length of the progress", () => {
    const { attr } = draw({ progress: 0.25 });
    const [dash, gap] = (attr("ring", "stroke-dasharray") ?? "").split(" ").map(Number);
    expect(dash).toBeCloseTo(0.25 * 2 * Math.PI * 25, 6);
    expect(gap).toBeCloseTo(2 * Math.PI * 25, 6);
  });

  it("treats a progress that is not a number as nothing done", () => {
    expect(iconAppearance("WORKING", Number.NaN).arcLength).toBe(0);
  });
});

describe("FloatingIcon colours per state", () => {
  const cases: [FloatingIconStatus, number, string | null, string | null, string | null][] = [
    // status, progress, dot fill, ring colour, ring opacity (D-74)
    ["WORKING", 0.5, "#34D27A", "#6FC9B6", "0.9"],
    ["MEETING", 0.5, "#A78BFA", "#A78BFA", "0.9"],
    ["BREAK", 0.5, "#F2A93B", "#6FC9B6", "0.36"],
    ["WORKING", 1, "#34D27A", "#34D27A", "0.95"],
    // A meeting stays purple until it ends, and a day ended stays teal at 30% (AGENT.md 1).
    ["MEETING", 1, "#A78BFA", "#A78BFA", "0.9"],
    ["BREAK", 1, "#F2A93B", "#34D27A", "0.36"],
    ["ENDED", 0.5, "none", "#6FC9B6", "0.3"],
    ["ENDED", 1, "none", "#6FC9B6", "0.3"],
  ];

  it.each(cases)("%s at %s", (status, progress, dot, ring, opacity) => {
    const { attr } = draw({ status, progress });
    expect(attr("dot", "fill")).toBe(dot);
    expect(attr("ring", "stroke")).toBe(ring);
    expect(attr("ring", "stroke-opacity")).toBe(opacity);
  });

  it("past the target the day ended ring stays teal, the running ones as above", () => {
    expect(iconAppearance("ENDED", 1.3).ringColor).toBe("#6FC9B6");
    expect(iconAppearance("MEETING", 1.3).ringColor).toBe("#A78BFA");
    expect(iconAppearance("BREAK", 1.3).ringColor).toBe("#34D27A");
  });

  it("past the target the ring keeps its opacity: 95% working, the status first otherwise", () => {
    expect(iconAppearance("WORKING", 1.3).ringOpacity).toBe(0.95);
    expect(iconAppearance("MEETING", 1.3).ringOpacity).toBe(0.9);
    expect(iconAppearance("BREAK", 1.3).ringOpacity).toBe(0.36);
    expect(iconAppearance("ENDED", 1.3).ringOpacity).toBe(0.3);
  });

  it("past the target the ring stays full and green", () => {
    const { attr } = draw({ progress: 1.3 });
    expect(attr("ring", "stroke")).toBe("#34D27A");
    expect(num((attr("ring", "stroke-dasharray") ?? "").split(" ")[0])).toBeCloseTo(
      RING_CIRCUMFERENCE,
      6,
    );
  });

  it("Day ended keeps today's total, dimmed to 30%, with a hollow grey dot", () => {
    const { attr } = draw({ status: "ENDED", progress: 0.75 });
    expect(attr("ring", "stroke-opacity")).toBe("0.3");
    expect(num((attr("ring", "stroke-dasharray") ?? "").split(" ")[0])).toBeCloseTo(
      0.75 * RING_CIRCUMFERENCE,
      6,
    );
    expect(attr("dot", "fill")).toBe("none");
    expect(attr("dot", "stroke")).toBe("#8A93A3");
  });

  it("Not started has an empty ring and a hollow grey dot, whatever the progress says", () => {
    const { attr, part } = draw({ status: "NOT_STARTED", progress: 0.6 });
    expect(part("ring")).toBeNull();
    expect(part("track")).not.toBeNull();
    expect(attr("dot", "fill")).toBe("none");
    expect(attr("dot", "stroke")).toBe("#8A93A3");
  });

  it("no state draws an empty arc: zero progress has no ring element", () => {
    const { part } = draw({ status: "WORKING", progress: 0 });
    expect(part("ring")).toBeNull();
  });

  it("has a soft shadow on the bezel only, no glow on the ring or the dot", () => {
    const { attr } = draw();
    expect(attr("bezel", "filter")).toMatch(/^url\(#/);
    expect(attr("ring", "filter")).toBeNull();
    expect(attr("dot", "filter")).toBeNull();
  });

  it("never uses red", () => {
    for (const status of ["NOT_STARTED", "WORKING", "MEETING", "BREAK", "ENDED"] as const) {
      for (const progress of [0, 0.5, 1]) {
        const { svg } = draw({ status, progress, badge: "!" });
        expect(svg.outerHTML).not.toMatch(/#(F00|FF0000|EF4444|DC2626)|red/i);
      }
    }
  });
});

describe("FloatingIcon content", () => {
  it("shows the image when there is one", () => {
    const { attr, part } = draw({ imageUrl: "/a.webp", initials: "AM" });
    expect(attr("avatar", "href")).toBe("/a.webp");
    expect(part("initials")).toBeNull();
  });

  it("shows the initials in the same bezel when there is none", () => {
    const { part } = draw({ imageUrl: null, initials: "AM" });
    expect(part("initials")?.textContent).toBe("AM");
    expect(part("avatar")).toBeNull();
    expect(part("bezel")).not.toBeNull();
  });

  describe("when the image does not load", () => {
    const failed = (props: Partial<FloatingIconProps> = {}) => {
      const icon = draw({ imageUrl: "/a.webp", initials: "AM", ...props });
      fireEvent.error(icon.part("avatar")!);
      return icon;
    };

    it("shows the initials in the same bezel, not an empty disc", () => {
      const { part } = failed();
      expect(part("avatar")).toBeNull();
      expect(part("initials")?.textContent).toBe("AM");
      expect(part("bezel")).not.toBeNull();
    });

    it("tries once more a moment later, then stays on the initials", () => {
      jest.useFakeTimers();
      try {
        const { part } = failed();
        act(() => {
          jest.advanceTimersByTime(2_000);
        });
        expect(part("avatar")).not.toBeNull();
        fireEvent.error(part("avatar")!);
        act(() => {
          jest.advanceTimersByTime(60_000);
        });
        expect(part("avatar")).toBeNull();
        expect(part("initials")?.textContent).toBe("AM");
      } finally {
        jest.useRealTimers();
      }
    });

    it("tries again once the sign-in has been renewed", async () => {
      const refresh = jest.spyOn(axios, "post").mockResolvedValue({});
      const { part } = failed();
      await act(() => refreshAccessToken());
      expect(part("avatar")).not.toBeNull();
      refresh.mockRestore();
    });

    it("a new image gets its own chance", () => {
      const { container, rerender } = render(
        <FloatingIcon status="WORKING" progress={0.5} imageUrl="/a.webp" initials="AM" />,
      );
      fireEvent.error(container.querySelector("image")!);
      rerender(<FloatingIcon status="WORKING" progress={0.5} imageUrl="/b.webp" initials="AM" />);
      expect(container.querySelector("image")?.getAttribute("href")).toBe("/b.webp");
    });
  });

  it("has no badge unless asked", () => {
    expect(draw().part("badge")).toBeNull();
    expect(draw({ badge: null }).part("badge")).toBeNull();
  });

  it.each([
    ["!", "!"],
    ["i", "i"],
    [3, "3"],
    [0, "0"],
    [9, "9"],
    [10, "9+"],
    [120, "9+"],
  ] as const)("shows the badge %s as %s", (badge, text) => {
    expect(draw({ badge }).part("badge")?.textContent).toBe(text);
  });

  it("puts the badge at the top right of the bezel", () => {
    const { part } = draw({ badge: "!" });
    const rect = part("badge")!.querySelector("rect")!;
    const x = num(rect.getAttribute("x")) + num(rect.getAttribute("width")) / 2;
    const y = num(rect.getAttribute("y")) + num(rect.getAttribute("height")) / 2;
    expect(x).toBeGreaterThan(40);
    expect(y).toBeLessThan(16);
  });

  describe("the badge at 56, as the design draws it (page 5, AGENT.md section 1)", () => {
    const RING_PATH = 25 * Math.SQRT1_2;
    const box = (attr: ReturnType<typeof draw>["attr"], name: string) => {
      const x = num(attr(name, "x"));
      const y = num(attr(name, "y"));
      const width = num(attr(name, "width"));
      const height = num(attr(name, "height"));
      return {
        width,
        height,
        radius: num(attr(name, "rx")),
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
        centreX: x + width / 2,
        centreY: y + height / 2,
      };
    };
    const expectOnTheRingPath = (at: { centreX: number; centreY: number }) => {
      expect(at.centreX).toBeCloseTo(28 + RING_PATH, 6);
      expect(at.centreY).toBeCloseTo(28 - RING_PATH, 6);
    };

    it.each(["!", "i", 3, 9] as const)(
      "%s: a 14 px dark circle round a 12 px light one",
      (badge) => {
        const { attr } = draw({ badge });
        const outer = box(attr, "badge-edge");
        const light = box(attr, "badge-fill");
        expect([outer.width, outer.height, outer.radius]).toEqual([14, 14, 7]);
        expect([light.width, light.height, light.radius]).toEqual([12, 12, 6]);
        expectOnTheRingPath(outer);
        expectOnTheRingPath(light);
      },
    );

    it.each(["!", "i", 3, 10] as const)(
      "%s: the design's colours, with no outline or shadow",
      (badge) => {
        const { attr, part } = draw({ badge });
        expect(attr("badge-edge", "fill")).toBe("#141920");
        expect(attr("badge-fill", "fill")).toBe("#E8EBF0");
        expect(attr("badge-glyph", "fill")).toBe("#141920");
        for (const name of ["badge-edge", "badge-fill"]) expect(attr(name, "stroke")).toBeNull();
        for (const el of part("badge")!.querySelectorAll("*")) {
          expect(el.getAttribute("filter")).toBeNull();
        }
      },
    );

    it.each(["!", "i", 3, 10] as const)("%s: a 7.5 px extra bold glyph in the middle", (badge) => {
      const { attr } = draw({ badge });
      expect(attr("badge-glyph", "font-size")).toBe("7.5");
      expect(attr("badge-glyph", "font-weight")).toBe("800");
      expect(attr("badge-glyph", "text-anchor")).toBe("middle");
      expect(num(attr("badge-glyph", "x"))).toBeCloseTo(28 + RING_PATH, 6);
      // On its alphabetic baseline, half a capital below the middle: the "central" baseline
      // follows each font's own ascent and descent, so it left the glyph off the middle.
      expect(attr("badge-glyph", "dominant-baseline")).toBeNull();
      const capital = 0.71 * 7.5;
      expect(num(attr("badge-glyph", "y"))).toBeCloseTo(28 - RING_PATH + capital / 2, 6);
    });

    it('"i" has the same geometry as "!"', () => {
      const action = draw({ badge: "!" }).part("badge")!.cloneNode(true) as Element;
      const info = draw({ badge: "i" }).part("badge")!.cloneNode(true) as Element;
      expect(info.textContent).toBe("i");
      info.querySelector("text")!.textContent = "!";
      expect(info.outerHTML).toBe(action.outerHTML);
    });

    it("past nine: a 15 x 12 pill in a 1 px edge, on the same centre, inside the icon's box", () => {
      const { attr } = draw({ badge: 12 });
      const outer = box(attr, "badge-edge");
      const light = box(attr, "badge-fill");
      expect([outer.width, outer.height, outer.radius]).toEqual([17, 14, 7]);
      expect([light.width, light.height, light.radius]).toEqual([15, 12, 6]);
      expectOnTheRingPath(outer);
      expectOnTheRingPath(light);
      expect(outer.left).toBeGreaterThanOrEqual(0);
      expect(outer.top).toBeGreaterThanOrEqual(0);
      expect(outer.right).toBeLessThanOrEqual(56);
      expect(outer.bottom).toBeLessThanOrEqual(56);
      expect(num(attr("badge-glyph", "x"))).toBeCloseTo(outer.centreX, 6);
    });

    it("the only shadow is the bezel's", () => {
      const { svg } = draw({ badge: 12 });
      const shadowed = [...svg.querySelectorAll("[filter]")].map((el) =>
        el.getAttribute("data-part"),
      );
      expect(shadowed).toEqual(["bezel"]);
    });
  });

  it("is labelled for a screen reader when given words, hidden otherwise", () => {
    expect(draw({ label: "Working · 5h 12m of 8h" }).svg.getAttribute("aria-label")).toBe(
      "Working · 5h 12m of 8h",
    );
    expect(draw().svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("gives every icon on a page its own gradient, clip and shadow", () => {
    const { container } = render(
      <>
        <FloatingIcon status="WORKING" progress={0.5} />
        <FloatingIcon status="BREAK" progress={0.5} />
      </>,
    );
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-zA-Z0-9_-]+$/.test(id))).toBe(true);
  });
});
