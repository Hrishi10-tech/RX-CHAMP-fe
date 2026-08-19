import { apiClient } from "@/lib/api";

/**
 * Clears both httpOnly cookies server-side. JavaScript cannot delete them, so
 * skipping this call leaves the refresh cookie valid for its full TTL — the
 * session stays usable long after the user thinks they signed out.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post("/api/v1/auth/logout");
  } catch {
    // Already signed out, or the server is unreachable. The local session is
    // cleared either way and the cookies expire on their own.
  }
}
