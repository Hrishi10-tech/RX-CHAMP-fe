"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import type { ModalProps } from "./types";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[aria-hidden='true']") && el.offsetParent !== null,
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className = "max-w-lg",
  ariaLabel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      // A Radix select or popover inside the dialog handles its own Escape and
      // marks the event; closing the whole dialog as well would lose the form.
      if (e.key === "Escape" && !e.defaultPrevented) onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Move focus into the dialog when it opens and give it back when it closes, so
  // keyboard and screen-reader users land in the form, not behind the backdrop.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const root = dialogRef.current;
      if (!root) return;
      const preferred = root.querySelector<HTMLElement>("[data-autofocus]");
      const first = preferred ?? focusablesIn(root).find((el) => !el.dataset.modalClose);
      (first ?? root).focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open]);

  function trapTab(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const items = focusablesIn(root);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open || typeof document === "undefined") return null;

  // Portalled to <body> so no transformed or clipped ancestor (the page-enter
  // animation, a scrolling table) can trap or cut off the overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={`relative z-10 max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none ${className}`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-bold tracking-tight text-slate-900">
                  {title}
                </h2>
              )}
              {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              data-modal-close="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
