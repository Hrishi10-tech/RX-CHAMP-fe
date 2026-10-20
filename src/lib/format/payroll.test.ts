import { hasOfflineTime, offlineText, paidSecOf } from "./payroll";

describe("paid time (SPEC 2.4: focus plus paid breaks)", () => {
  it("takes the server's figure when it sends one", () => {
    expect(paidSecOf({ paidSec: 9000, focusSec: 1, paidBreakSec: 1 })).toBe(9000);
    expect(paidSecOf({ paidSec: 0, focusSec: 3600, paidBreakSec: 600 })).toBe(0);
  });

  it("works it out from focus and paid breaks when the server leaves it out", () => {
    expect(paidSecOf({ focusSec: 3600, paidBreakSec: 600 })).toBe(4200);
    expect(paidSecOf({ focusSec: 3600 })).toBe(3600);
    expect(paidSecOf({ paidSec: null, focusSec: "x", paidBreakSec: undefined })).toBe(0);
  });
});

describe("offline time without activity data", () => {
  it("is shown only when it reads as at least a minute", () => {
    expect(hasOfflineTime(0)).toBe(false);
    expect(hasOfflineTime(29)).toBe(false);
    expect(hasOfflineTime(30)).toBe(true);
    expect(hasOfflineTime(null)).toBe(false);
    expect(offlineText(12_600)).toBe("3h 30m offline, no activity data");
    expect(offlineText(-60)).toBeNull();
  });
});
