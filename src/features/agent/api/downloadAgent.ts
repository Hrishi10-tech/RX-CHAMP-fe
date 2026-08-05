import { apiClient } from "@/lib/api";

export async function downloadAgentForUser(
  userId: string,
  fileName = "RXChampAgent.exe",
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
