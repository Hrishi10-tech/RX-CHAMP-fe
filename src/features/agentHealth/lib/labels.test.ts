import type { AgentHealthFlag, AgentHealthRow } from "@/features/agentHealth/types";
import { FLAG_COPY, refusalText, sortRows } from "./labels";

const ALL_FLAGS: AgentHealthFlag[] = [
  "NEVER_REPORTED",
  "SIGNED_OUT",
  "AGENT_OFFLINE",
  "DAY_NOT_STARTED",
  "SCREENSHOTS_OFF",
  "NO_SCREENSHOTS_TODAY",
  "SCREENSHOTS_STALE",
  "UPLOAD_REFUSED",
  "OLD_AGENT",
];

describe("agent health labels", () => {
  it("names every flag the way the release notes do", () => {
    expect(ALL_FLAGS.map((f) => FLAG_COPY[f].label)).toEqual([
      "Agent never seen",
      "Signed out",
      "Agent offline",
      "No Start Day",
      "Screenshots off",
      "No screenshots today",
      "Screenshots stopped",
      "Upload refused",
      "Old agent",
    ]);
  });

  it("explains a refusal with its size", () => {
    expect(
      refusalText({
        at: "2026-11-03T06:00:00Z",
        status: 413,
        code: "TOO_LARGE",
        reason: "the limit is 32 MB.",
        bytes: 34 * 1048576,
      }),
    ).toBe("too large (34.0 MB): the limit is 32 MB.");
    expect(
      refusalText({ at: "x", status: 400, code: "NO_FILE", reason: "no file", bytes: null }),
    ).toBe("empty upload: no file");
  });

  it("sorts problems first, then by name", () => {
    const row = (name: string, flags: AgentHealthFlag[]) => ({ name, flags }) as AgentHealthRow;
    expect(
      sortRows([row("Cara", []), row("Bala", ["SIGNED_OUT"]), row("Asha", [])]).map((r) => r.name),
    ).toEqual(["Bala", "Asha", "Cara"]);
  });
});
