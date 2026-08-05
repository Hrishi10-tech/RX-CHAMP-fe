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
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="relative px-8 pb-8 pt-10 text-center">
        {Icon && (
          <span
            className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
              destructive
                ? "bg-[rgba(236,43,120,0.12)] text-[rgb(236_43_120)]"
                : "bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]"
            }`}
          >
            <Icon className="h-6 w-6" />
          </span>
        )}

        <h2 className="text-2xl font-[650] tracking-tight text-slate-900">{title}</h2>
        {description && (
          <div className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            {description}
          </div>
        )}

        <div className="mt-8 flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-w-[128px] rounded-lg border-2 border-slate-200 bg-white px-6 py-3 text-sm font-[650] text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex min-w-[128px] items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-[650] text-white shadow-md transition-colors disabled:opacity-70 ${
              destructive
                ? "bg-[rgb(236_43_120)] shadow-[rgba(236,43,120,0.35)] hover:bg-[rgb(214_31_104)]"
                : "bg-[rgb(34_34_204)] shadow-[rgba(34,34,204,0.3)] hover:bg-[rgb(28_28_180)]"
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
