/** Mirrors backend/src/modules/agent/application/agent.types.ts. */

/** windows: installer; mac: Apple Silicon app (zip); mac-x64: Intel app (zip). */
export type AgentPlatform = "windows" | "mac" | "mac-x64";

export interface AgentVersionInfo {
  version: string;
  fileName: string;
  available: boolean;
  sizeBytes: number;
  /** SHA-256 of the download, or "" when the server can't say. */
  sha256: string;
  platform: AgentPlatform;
}

/** Pasted into the Mac agent's sign-in screen; signs it in as that person. */
export interface AgentSetupCode {
  /** "RXV1." + base64url JSON. A credential: treat it like a password. */
  code: string;
  apiBaseUrl: string;
  userId: string;
}
