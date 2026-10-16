import type { AgentPlatform } from "@/features/agent/types";

/** "Asha K." -> "Asha-K"; empty when nothing usable is left. */
export function nameSlug(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extensionOf(fileName: string | undefined): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(fileName ?? "");
  return m ? m[1].toLowerCase() : null;
}

/**
 * What the downloaded file is saved as. The portal names it (a blob saved via
 * `a.download` ignores the server's Content-Disposition), so it follows the
 * server's file name for the extension: the Windows build can be a single .exe or
 * a .zip of the app folder, depending on how it was published.
 *
 * Windows downloads carry that person's sign-in, so their name goes in the file
 * name; the Mac app is the same for everyone and keeps the server's name.
 */
export function agentDownloadName(
  platform: AgentPlatform,
  personName: string,
  serverFileName?: string,
): string {
  if (platform !== "windows") {
    if (serverFileName && extensionOf(serverFileName)) return serverFileName;
    return platform === "mac" ? "RXVision-mac.zip" : "RXVision-mac-intel.zip";
  }
  const ext = extensionOf(serverFileName) ?? "exe";
  const slug = nameSlug(personName);
  return slug ? `RXVision-${slug}.${ext}` : `RXVision.${ext}`;
}

/** 50331648 -> "48 MB"; 1536000 -> "1.5 MB". Empty for unknown sizes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
