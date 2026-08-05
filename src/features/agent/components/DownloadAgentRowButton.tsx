"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { downloadAgentForUser } from "@/features/agent/api/downloadAgent";
import { rowActionButtonClass, rowActionHover } from "@/components/ui/rowAction";

function agentFileName(name: string): string {
  const slug = name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `RXChampAgent-${slug}.exe` : "RXChampAgent.exe";
}

export function DownloadAgentRowButton({ userId, userName }: { userId: string; userName: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const fileName = agentFileName(userName);
    setLoading(true);
    try {
      await downloadAgentForUser(userId, fileName);
      toast.success("Download started", { description: fileName });
    } catch {
      toast.error("Couldn't download the agent", {
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title={`Download agent for ${userName}`}
      aria-label={`Download agent for ${userName}`}
      className={`${rowActionButtonClass} ${rowActionHover.primary}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  );
}
