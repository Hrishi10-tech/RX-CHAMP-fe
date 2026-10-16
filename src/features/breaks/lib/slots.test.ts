import type { BreakRecordView } from "@/features/breaks/types";
import { serverClock, slotStatus } from "./slots";

const slot = {
  windowOpen: "2026-10-13T05:00:00.000Z",
  windowClose: "2026-10-13T06:30:00.000Z",
  record: null,
};
const at = (iso: string) => Date.parse(iso);

describe("slotStatus", () => {
  it("follows the window", () => {
    expect(slotStatus(slot, at("2026-10-13T04:59:59Z"))).toBe("UPCOMING");
    expect(slotStatus(slot, at("2026-10-13T05:00:00Z"))).toBe("OPEN");
    expect(slotStatus(slot, at("2026-10-13T06:29:59Z"))).toBe("OPEN");
    expect(slotStatus(slot, at("2026-10-13T06:30:00Z"))).toBe("MISSED");
  });

  it("prefers what was actually taken", () => {
    const record = { inProgress: true } as BreakRecordView;
    expect(slotStatus({ ...slot, record }, at("2026-10-13T07:00:00Z"))).toBe("IN_PROGRESS");
    expect(
      slotStatus({ ...slot, record: { ...record, inProgress: false } }, at("2026-10-13T04:00:00Z")),
    ).toBe("TAKEN");
  });
});

describe("serverClock", () => {
  it("carries the server's time forward from when it was read", () => {
    const fetchedAt = 1_000_000;
    // The browser runs 10 minutes fast; 30 s have passed since the response.
    expect(serverClock("2026-10-13T05:00:00.000Z", fetchedAt, fetchedAt + 30_000)).toBe(
      at("2026-10-13T05:00:30.000Z"),
    );
  });

  it("falls back to the browser clock without a usable server time", () => {
    expect(serverClock("garbage", 1, 42)).toBe(42);
    expect(serverClock("2026-10-13T05:00:00.000Z", 0, 42)).toBe(42);
  });
});
