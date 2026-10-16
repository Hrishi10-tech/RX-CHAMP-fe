import type { HourActivity } from "@/features/activity/types/hourly";
import {
  barHeight,
  crossesMidnight,
  hourOrder,
  hourlyLabel,
  inSpan,
  normalizeHours,
  spanHours,
  spanOf,
  workSpan,
} from "./hourly";

/** An instant from business time (Asia/Kolkata, UTC+05:30). */
const ist = (day: string, hm: string) => new Date(`${day}T${hm}:00+05:30`).toISOString();

function hour(h: number, patch: Partial<HourActivity> = {}): HourActivity {
  return {
    hour: h,
    activeMin: 0,
    availableMin: 0,
    breakMin: 0,
    meetingMin: 0,
    quiet: false,
    ...patch,
  };
}

describe("normalizeHours", () => {
  it("always gives 24 hours in order", () => {
    const hours = normalizeHours([hour(10, { activeMin: 30, availableMin: 60 }), hour(9)]);
    expect(hours).toHaveLength(24);
    expect(hours.map((h) => h.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(hours[10].activeMin).toBe(30);
  });

  it("drops bad hours and bad numbers", () => {
    const hours = normalizeHours([
      hour(-1, { activeMin: 5 }),
      hour(24, { activeMin: 5 }),
      hour(3, { activeMin: Number.NaN, availableMin: 90 }),
      hour(3, { activeMin: 50 }),
    ]);
    expect(hours[3]).toMatchObject({ activeMin: 0, availableMin: 60 });
    expect(normalizeHours(undefined)).toHaveLength(24);
  });
});

describe("workSpan", () => {
  it("runs from the first to the last hour of the day, breaks included", () => {
    const hours = normalizeHours([
      hour(9, { availableMin: 36, activeMin: 30 }),
      hour(13, { breakMin: 60 }),
      hour(18, { availableMin: 10, activeMin: 4 }),
    ]);
    expect(workSpan(hours)).toEqual({ start: 9, end: 18 });
  });

  it("is null before Start Day", () => {
    expect(workSpan(normalizeHours([]))).toBeNull();
  });

  it("follows a night shift through midnight (18:30 to 03:30)", () => {
    const night = normalizeHours(
      [18, 19, 20, 21, 22, 23, 0, 1, 2, 3].map((h) =>
        hour(h, { availableMin: h === 18 ? 30 : 60, activeMin: 40 }),
      ),
    );
    const bounds = { startedAt: ist("2026-09-15", "18:36"), endedAt: ist("2026-09-16", "03:35") };
    expect(crossesMidnight(bounds.startedAt, bounds.endedAt)).toBe(true);
    const span = workSpan(night, bounds);
    expect(span).toEqual({ start: 18, end: 3 });
    expect(spanHours(span)).toEqual([18, 19, 20, 21, 22, 23, 0, 1, 2, 3]);
    expect(inSpan(span, 23)).toBe(true);
    expect(inSpan(span, 2)).toBe(true);
    expect(inSpan(span, 12)).toBe(false);
    // Drawn in one piece, from 12:00: 12 … 23, then 00 … 11.
    const order = hourOrder(span);
    expect([0, 6, 12, 18].map((i) => order[i])).toEqual([12, 18, 0, 6]);
    expect(hourlyLabel("Farah K", night, span)).toMatch(
      /^Farah K, .* from 18:00 to 04:00: 18:00 40 min, .* 03:00 40 min\.$/,
    );
  });

  it("ends at the hour before a day that closes on the hour", () => {
    expect(
      workSpan(normalizeHours([]), {
        startedAt: ist("2026-09-15", "19:00"),
        endedAt: ist("2026-09-16", "03:00"),
      }),
    ).toEqual({ start: 19, end: 2 });
  });

  it("never wraps a split day that stays within the calendar day (06 to 07, 19 to 21)", () => {
    const split = normalizeHours(
      [6, 7, 19, 20, 21].map((h) => hour(h, { availableMin: 45, activeMin: 30 })),
    );
    const bounds = { startedAt: ist("2026-09-15", "06:10"), endedAt: ist("2026-09-15", "21:40") };
    expect(crossesMidnight(bounds.startedAt, bounds.endedAt)).toBe(false);
    const span = workSpan(split, bounds);
    expect(span).toEqual({ start: 6, end: 21 });
    // Drawn 00 to 23 with the span highlighted, labelled 06:00 to 22:00.
    expect(hourOrder(span)).toEqual(Array.from({ length: 24 }, (_, h) => h));
    expect(hourlyLabel("Rahul V", split, span)).toMatch(
      /from 06:00 to 22:00: 06:00 30 min, 07:00 30 min, 08:00 0 min/,
    );
    // Without its times it reads the same: no guessing from the gaps.
    expect(workSpan(split)).toEqual({ start: 6, end: 21 });
  });

  it("only counts a day as crossing midnight when both ends are known", () => {
    expect(crossesMidnight(ist("2026-09-15", "18:36"), null)).toBe(false);
    expect(crossesMidnight(null, ist("2026-09-16", "03:00"))).toBe(false);
    expect(crossesMidnight(ist("2026-09-16", "03:00"), ist("2026-09-15", "18:36"))).toBe(false);
  });
});

describe("hour order", () => {
  const busy = (...hours: number[]) => Array.from({ length: 24 }, (_, h) => hours.includes(h));

  it("keeps 00 to 23 for a day that stays within the calendar day", () => {
    expect(hourOrder(spanOf(busy(9, 10, 13, 18)))).toEqual(Array.from({ length: 24 }, (_, h) => h));
    expect(hourOrder(null)[0]).toBe(0);
  });

  it("draws a night shift in one piece, from the 6-hour mark before it starts", () => {
    const order = hourOrder(spanOf(busy(18, 19, 22, 23, 0, 3)));
    expect(order.slice(0, 3)).toEqual([12, 13, 14]);
    expect(order.indexOf(3)).toBeGreaterThan(order.indexOf(23));
    expect([0, 6, 12, 18].map((i) => order[i])).toEqual([12, 18, 0, 6]);
  });

  it("starts at the shift itself when no 6-hour mark falls in the gap", () => {
    // Busy 05..23 and 00..04 except 04: the only gap is 04, so the span is 05 to 03.
    const order = hourOrder(
      spanOf(busy(...Array.from({ length: 24 }, (_, h) => h).filter((h) => h !== 4))),
    );
    expect(order[0]).toBe(5);
  });

  it("prefers the gap that holds midnight on a tie, so a split day does not wrap", () => {
    // 06..11 and 18..23 busy: two 6-hour gaps (00..05 and 12..17).
    expect(spanOf(busy(6, 7, 8, 9, 10, 11, 18, 19, 20, 21, 22, 23))).toEqual({ start: 6, end: 23 });
  });

  it("covers the whole clock when every hour is busy", () => {
    expect(spanOf(busy(...Array.from({ length: 24 }, (_, h) => h)))).toEqual({ start: 0, end: 23 });
    expect(spanOf(busy())).toBeNull();
  });
});

describe("bars and labels", () => {
  it("scales bars to 60 minutes with a visible minimum", () => {
    expect(barHeight(30, 28)).toBe(14);
    expect(barHeight(0, 28)).toBe(2);
    expect(barHeight(90, 28)).toBe(28);
  });

  it("reads the strip out loud, quiet hours included", () => {
    const hours = normalizeHours([
      hour(9, { availableMin: 60, activeMin: 41 }),
      hour(10, { availableMin: 60, activeMin: 12, quiet: true }),
    ]);
    expect(hourlyLabel("Rahul V", hours, workSpan(hours))).toBe(
      "Rahul V, keyboard and mouse minutes by hour from 09:00 to 11:00: 09:00 41 min, 10:00 12 min. Quiet hour: 10:00.",
    );
    const none = normalizeHours([]);
    expect(hourlyLabel("Rahul V", none, workSpan(none))).toBe("Rahul V: no activity recorded.");
  });

  it("reads a night shift in the order it happened", () => {
    const hours = normalizeHours([
      hour(22, { availableMin: 60, activeMin: 50 }),
      hour(23, { availableMin: 60, activeMin: 45 }),
      hour(0, { availableMin: 60, activeMin: 30 }),
    ]);
    const span = workSpan(hours, {
      startedAt: ist("2026-09-15", "22:00"),
      endedAt: ist("2026-09-16", "00:50"),
    });
    expect(hourlyLabel("Divya S", hours, span)).toBe(
      "Divya S, keyboard and mouse minutes by hour from 22:00 to 01:00: 22:00 50 min, 23:00 45 min, 00:00 30 min.",
    );
  });
});
