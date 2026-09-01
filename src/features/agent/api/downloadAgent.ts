import { apiClient } from "@/lib/api";

/**
 * The name is set here, not taken from the response: this reads the body as a blob
 * and saves it with `a.download`, which overrides the server's Content-Disposition
 * entirely. So the backend's agent.fileName never reaches the user through this
 * path — the two have to be kept in step by hand.
 */
export async function downloadAgentForUser(
  userId: string,
  fileName = "RXVision.exe",
): Promise<void> {
  const res = await apiClient.get<Blob>("/api/v1/agent/download", {
    params: { userId },
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
    URL.revokeObjectURL(url);
  }
}
