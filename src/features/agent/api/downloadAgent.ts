import { apiClient } from "@/lib/api";
import type { AgentPlatform } from "@/features/agent/types";

/**
 * Downloads the agent for one person and saves it as `fileName`.
 *
 * The name is set here, not taken from the response: this reads the body as a
 * blob and saves it with `a.download`, which overrides the server's
 * Content-Disposition entirely. Windows downloads have that person's sign-in
 * baked in; the Mac app is the same for everyone (it signs in with a setup code),
 * but the request still names the person so the server checks they are yours.
 */
export async function downloadAgentForUser(
  userId: string,
  fileName = "RXVision.exe",
  platform: AgentPlatform = "windows",
): Promise<void> {
  const res = await apiClient.get<Blob>("/api/v1/agent/download", {
    params: { userId, platform },
    responseType: "blob",
  });

  const url = URL.createObjectURL(res.data);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoked on the next tick: some browsers start reading the blob after click()
    // returns, and an immediate revoke can cancel the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
