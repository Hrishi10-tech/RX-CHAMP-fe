import { layoutTimeline, zoneOffsetMs } from "./timeline";

const IST = 5.5 * 3600_000;

describe("zoneOffsetMs", () => {
  it("knows IST is UTC+5:30", () => {
    expect(zoneOffsetMs(Date.parse("2026-10-12T04:00:00Z"), "Asia/Kolkata")).toBe(IST);
    expect(zoneOffsetMs(Date.parse("2026-10-12T04:00:00Z"), "UTC")).toBe(0);
  });
});

describe("layoutTimeline", () => {
  // 09:24 to 18:43 IST on 12 Oct 2026.
  const work = [
    {
      kind: "WORK" as const,
      startedAt: "2026-10-12T03:54:00Z",
      endedAt: "2026-10-12T05:30:00Z",
      label: "Focus",
    },
    {
      kind: "BREAK" as const,
      startedAt: "2026-10-12T05:30:00Z",
      endedAt: "2026-10-12T05:43:00Z",
      label: "Morning break",
    },
    {
      kind: "WORK" as const,
      startedAt: "2026-10-12T05:43:00Z",
      endedAt: "2026-10-12T13:13:00Z",
      label: "Focus",
    },
  ];

  it("runs from the business hour before the start to the one after the end", () => {
    const layout = layoutTimeline(work, [], IST);
    // 09:00 IST is 03:30 UTC; 19:00 IST is 13:30 UTC.
    expect(new Date(layout!.startMs).toISOString()).toBe("2026-10-12T03:30:00.000Z");
    expect(new Date(layout!.endMs).toISOString()).toBe("2026-10-12T13:30:00.000Z");
    expect(layout!.ticks).toHaveLength(11);
  });

  it("places segments in percent and totals them by kind", () => {
    const layout = layoutTimeline(work, [], IST)!;
    expect(layout.segments[0].left).toBeCloseTo(4, 5); // 24 of 600 minutes
    expect(layout.segments[1].width).toBeCloseTo((13 / 600) * 100, 5);
    expect(layout.totals.BREAK).toBe(13 * 60);
    expect(layout.totals.WORK).toBe((96 + 450) * 60);
  });

  it("places skip markers on the bar", () => {
    const layout = layoutTimeline(
      work,
      [{ at: "2026-10-12T10:28:00Z", kind: "EVENING", label: "Evening break", outcome: "SKIPPED" }],
      IST,
    )!;
    expect(layout.markers).toHaveLength(1);
    expect(layout.markers[0].left).toBeCloseTo((418 / 600) * 100, 5);
  });

  it("drops broken segments and gives null for an empty day", () => {
    expect(layoutTimeline([], [], IST)).toBeNull();
    expect(
      layoutTimeline(
        [{ kind: "WORK", startedAt: "nope", endedAt: "2026-10-12T05:00:00Z", label: "Focus" }],
        [],
        IST,
      ),
    ).toBeNull();
  });
});
