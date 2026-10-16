import { buildTimeline, type TimelineInput } from "./timeline";

const rules = { ringLeadMin: 1, ringDurationMin: 5 };

function input(partial: Partial<TimelineInput> = {}): TimelineInput {
  return {
    start: "09:30",
    end: "18:30",
    rules,
    breaks: [
      {
        kind: "MORNING",
        enabled: true,
        startTime: "11:00",
        durationMin: 15,
        windowBeforeMin: 30,
        windowAfterMin: 60,
      },
      {
        kind: "LUNCH",
        enabled: true,
        startTime: "13:00",
        durationMin: 30,
        windowBeforeMin: 30,
        windowAfterMin: 60,
      },
      {
        kind: "EVENING",
        enabled: false,
        startTime: "16:00",
        durationMin: 15,
        windowBeforeMin: 30,
        windowAfterMin: 60,
      },
    ],
    ...partial,
  };
}

describe("buildTimeline", () => {
  it("places windows, slots and rings as percentages of the shift", () => {
    const t = buildTimeline(input());
    expect(t?.spanMin).toBe(540);
    // Only enabled breaks are drawn.
    expect(t?.breaks.map((b) => b.kind)).toEqual(["MORNING", "LUNCH"]);
    const morning = t!.breaks[0];
    // 10:30 is 60 of 540 minutes in; the window is 90 minutes wide.
    expect(morning.window).toEqual({ left: 11.11, width: 16.67 });
    expect(morning.slot).toEqual({ left: 16.67, width: 2.78 });
    expect(morning.ring).toEqual({ left: 16.48, width: 0.93 });
    expect(morning.clipped).toBe(false);
  });

  it("puts hour marks inside the shift, thinned and clear of the ends", () => {
    const t = buildTimeline(input(), { maxTicks: 7, edgeGapPct: 7 });
    // Every 2 hours for a 9-hour shift; 10:00 and 18:00 sit too close to the
    // 09:30 and 18:30 edge labels and are dropped.
    expect(t?.ticks.map((x) => x.label)).toEqual(["12:00", "14:00", "16:00"]);
    for (const tick of t!.ticks) {
      expect(tick.left).toBeGreaterThanOrEqual(7);
      expect(tick.left).toBeLessThanOrEqual(93);
    }
  });

  it("reads early-morning times on an overnight shift as the next day", () => {
    const t = buildTimeline(
      input({
        start: "22:00",
        end: "06:00",
        breaks: [
          {
            kind: "MORNING",
            enabled: true,
            startTime: "23:30",
            durationMin: 15,
            windowBeforeMin: 30,
            windowAfterMin: 30,
          },
          {
            kind: "LUNCH",
            enabled: true,
            startTime: "02:00",
            durationMin: 30,
            windowBeforeMin: 30,
            windowAfterMin: 30,
          },
        ],
      }),
    );
    expect(t?.spanMin).toBe(480);
    const lunch = t!.breaks.find((b) => b.kind === "LUNCH")!;
    // 02:00 is 240 of 480 minutes after 22:00.
    expect(lunch.slot.left).toBe(50);
    expect(lunch.clipped).toBe(false);
  });

  it("clips anything outside the shift and flags it", () => {
    const t = buildTimeline(
      input({
        breaks: [
          {
            kind: "MORNING",
            enabled: true,
            startTime: "09:40",
            durationMin: 15,
            windowBeforeMin: 30,
            windowAfterMin: 30,
          },
          {
            kind: "EVENING",
            enabled: true,
            startTime: "20:00",
            durationMin: 15,
            windowBeforeMin: 30,
            windowAfterMin: 30,
          },
        ],
      }),
    );
    const [morning, evening] = t!.breaks;
    expect(morning.window.left).toBe(0);
    expect(morning.clipped).toBe(true);
    expect(evening.slot).toEqual({ left: 100, width: 0 });
    expect(evening.clipped).toBe(true);
  });

  it("gives up on unusable shift times", () => {
    expect(buildTimeline(input({ start: "9:3" }))).toBeNull();
    expect(buildTimeline(input({ start: "10:00", end: "10:00" }))).toBeNull();
  });
});
