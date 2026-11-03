import { apiClient } from "@/lib/api";
import type { AgentPlatform } from "@/features/agent/types";

/**
 * Downloads the agent for one person. Windows downloads have that person's
 * sign-in baked in; the Mac app is the same for everyone (it signs in with a
 * setup code), but the request still names the person so the server checks they
 * may.
 *
 * 4.0: only an Admin (their organisation's Managers and Staff) or a Super Admin
 * (also an organisation's Admin) may, and never for themselves (403): for your
 * own computer use `downloadAgentInstaller`.
 *
 * The saved file name now comes from the server (Content-Disposition);
 * `_fileName` is kept so existing callers need no change.
 */
export async function downloadAgentForUser(
  userId: string,
  _fileName = "RXVision.exe",
  platform: AgentPlatform = "windows",
): Promise<void> {
  await saveAgent({ userId, platform });
}

/**
 * The plain installer, the same for everyone (no `userId`): it opens the sign-in
 * screen, where the person signs in with their email and password.
 */
export async function downloadAgentInstaller(
  _fileName = "RXVision.exe",
  platform: AgentPlatform = "windows",
): Promise<void> {
  await saveAgent({ platform });
}

interface DownloadTicket {
  url: string;
  expiresInSec: number;
}

/**
 * The installer is tens of MB, and the portal's host (AWS Amplify) refuses
 * responses that large through its /api proxy (413). So the page asks for a
 * one-minute, single-use link (a small reply, through the proxy, with the sign-in
 * cookie) and the browser downloads the file from the API host directly.
 */
async function saveAgent(params: Record<string, string>): Promise<void> {
  const res = await apiClient.post<{ data?: DownloadTicket } & Partial<DownloadTicket>>(
    "/api/v1/agent/download-ticket",
    undefined,
    { params },
  );
  const url = res.data?.data?.url ?? res.data?.url;
  if (!url) throw new Error("The server did not return a download link.");

  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
