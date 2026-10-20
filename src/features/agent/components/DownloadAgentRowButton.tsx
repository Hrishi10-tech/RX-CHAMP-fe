"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { rowActionButtonClass, rowActionHover } from "@/components/ui/rowAction";
import { DownloadAgentDialog } from "@/features/agent/components/DownloadAgentDialog";

/**
 * Row action: opens the desktop-app dialog (Windows installer, or Mac app + setup
 * code). On the viewer's own row (`self`) it offers the plain installer instead:
 * the API never issues a sign-in for yourself.
 */
export function DownloadAgentRowButton({
  userId,
  userName,
  self = false,
}: {
  userId: string;
  userName: string;
  self?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = self
    ? "Get the desktop app for this computer"
    : `Get the desktop app for ${userName}`;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={label}
        aria-label={label}
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
            self={self}
          />
        </div>
      )}
    </>
  );
}
