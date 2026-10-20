import { agentDownloadName, formatBytes, nameSlug } from "./fileName";

describe("agentDownloadName", () => {
  it("names a Windows installer after the person", () => {
    expect(agentDownloadName("windows", "Asha K.", "RXVision.exe")).toBe("RXVision-Asha-K.exe");
  });

  it("follows the server's extension when the Windows build is a zip", () => {
    expect(agentDownloadName("windows", "Asha K", "RXVision.zip")).toBe("RXVision-Asha-K.zip");
    expect(agentDownloadName("windows", "Asha K", undefined)).toBe("RXVision-Asha-K.exe");
  });

  it("falls back to a plain name when nothing usable is left of the name", () => {
    expect(agentDownloadName("windows", "  ...  ", "RXVision.exe")).toBe("RXVision.exe");
  });

  it("keeps the plain installer (no one's sign-in in it) under a plain name", () => {
    expect(agentDownloadName("windows", null, "RXVision.exe")).toBe("RXVision.exe");
    expect(agentDownloadName("windows", null, "RXVision.zip")).toBe("RXVision.zip");
  });

  it("keeps the server's Mac file names", () => {
    expect(agentDownloadName("mac", "Asha", "RXVision-mac.zip")).toBe("RXVision-mac.zip");
    expect(agentDownloadName("mac-x64", "Asha", "RXVision-mac-intel.zip")).toBe(
      "RXVision-mac-intel.zip",
    );
    expect(agentDownloadName("mac", "Asha", "")).toBe("RXVision-mac.zip");
    expect(agentDownloadName("mac-x64", "Asha")).toBe("RXVision-mac-intel.zip");
  });
});

describe("helpers", () => {
  it("slugs names safely", () => {
    expect(nameSlug("Ravi  Kumar (QA)")).toBe("Ravi-Kumar-QA");
    expect(nameSlug("Zoë")).toBe("Zo");
  });

  it("formats sizes", () => {
    expect(formatBytes(0)).toBe("");
    expect(formatBytes(512)).toBe("1 KB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
    expect(formatBytes(48.4 * 1024 * 1024)).toBe("48 MB");
  });
});
