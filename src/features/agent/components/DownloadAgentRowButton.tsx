"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { rowActionButtonClass, rowActionHover } from "@/components/ui/rowAction";
import { DownloadAgentDialog } from "@/features/agent/components/DownloadAgentDialog";

/** Row action: opens the desktop-app dialog (Windows installer, or Mac app + setup code). */
export function DownloadAgentRowButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={`Get the desktop app for ${userName}`}
        aria-label={`Get the desktop app for ${userName}`}
        aria-haspopup="dialog"
        className={`${rowActionButtonClass} ${rowActionHover.primary}`}
      >
        <Download className="h-4 w-4" />
      </button>
      {open && (
        // The dialog sits inside a clickable table row: keep its clicks there.
        <div onClick={(e) => e.stopPropagation()}>
          <DownloadAgentDialog
            open={open}
            onClose={() => setOpen(false)}
            userId={userId}
            userName={userName}
          />
        </div>
      )}
    </>
  );
}
