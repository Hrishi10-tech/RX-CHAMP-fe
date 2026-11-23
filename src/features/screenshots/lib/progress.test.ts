import { durationText, etaText, sizeText } from "./progress";

describe("export progress words", () => {
  it("says how long is left", () => {
    expect(etaText(null)).toBe("Working out the time left…");
    expect(etaText(30)).toBe("Under a minute left");
    expect(etaText(150)).toBe("About 3 min left");
    expect(etaText(3900)).toBe("About 1 h 5 min left");
  });

  it("says how big a file is", () => {
    expect(sizeText(0)).toBe("0 KB");
    expect(sizeText(850 * 1024)).toBe("850 KB");
    expect(sizeText(12.4 * 1024 * 1024)).toBe("12.4 MB");
  });

  it("says how long a report will take", () => {
    expect(durationText(20)).toBe("under a minute");
    expect(durationText(600)).toBe("about 10 min");
  });
});
