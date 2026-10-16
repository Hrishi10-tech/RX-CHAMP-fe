import { heatmapHours } from "./heatmap";

const ist = (day: string, hm: string) => new Date(`${day}T${hm}:00+05:30`).toISOString();
const row = (...busy: number[]) => ({
  hours: Array.from({ length: 24 }, (_, h) => (busy.includes(h) ? 30 : 0)),
});

describe("heatmapHours", () => {
  it("keeps 00 to 23 order for split days that stay within the day", () => {
    const days = [{ startedAt: ist("2026-09-15", "06:05"), endedAt: ist("2026-09-15", "21:30") }];
    expect(heatmapHours([row(6, 7, 19, 20, 21)], days)).toEqual(
      Array.from({ length: 16 }, (_, i) => 6 + i),
    );
  });

  it("reads around the clock once a day's work ran past midnight", () => {
    const days = [
      { startedAt: ist("2026-09-15", "18:36"), endedAt: ist("2026-09-16", "03:35") },
      { startedAt: null, endedAt: null },
    ];
    expect(heatmapHours([row(18, 19, 23, 0, 3)], days)).toEqual([
      18, 19, 20, 21, 22, 23, 0, 1, 2, 3,
    ]);
  });

  it("has no columns for a month with no activity", () => {
    expect(heatmapHours([], [])).toEqual([]);
  });
});
