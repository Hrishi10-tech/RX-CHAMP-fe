import { reasonAccepted } from "./presets";

describe("reasonAccepted", () => {
  it("takes a quick answer as it is, or a long enough text", () => {
    expect(reasonAccepted("Traffic", 10, ["Traffic"])).toBe(true);
    expect(reasonAccepted(" traffic ", 10, ["Traffic"])).toBe(true);
    expect(reasonAccepted("Traffic!", 10, ["Traffic"])).toBe(false);
    expect(reasonAccepted("Stuck at the toll gate", 10, [])).toBe(true);
    expect(reasonAccepted("", 10, ["Traffic"])).toBe(false);
  });
});
