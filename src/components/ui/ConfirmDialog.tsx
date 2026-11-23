"use client";

import { Loader2 } from "lucide-react";

import { Modal } from "./Modal";
import type { ConfirmDialogProps } from "./types";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  icon: Icon,
  destructive = false,
  loading = false,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-md" ariaLabel={title}>
      <div className="relative px-8 pb-8 pt-10 text-center">
        {Icon && (
          <span
            className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
              destructive ? "bg-attention/12 text-attention" : "bg-brand/10 text-brand"
            }`}
          >
            <Icon className="h-6 w-6" />
          </span>
        )}

        <h2 className="text-2xl font-[650] tracking-tight text-primary">{title}</h2>
        {description && (
          <div className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-quiet">
            {description}
          </div>
        )}

        <div className="mt-8 flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-w-[128px] rounded-lg border border-card bg-fill px-6 py-3 text-sm font-[650] text-primary transition-colors hover:bg-edge disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className={`inline-flex min-w-[128px] items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-[650] text-on-brand shadow-md transition-colors disabled:opacity-70 ${
              destructive
                ? "bg-attention shadow-attention/35 hover:bg-attention-hover"
                : "bg-brand shadow-brand/30 hover:bg-brand-hover"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
