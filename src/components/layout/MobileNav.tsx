"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * The navigation drawer for screens too narrow for the sidebar. Same links as
 * the sidebar (the caller passes them in); closes on Escape, on the backdrop and
 * on navigating, and keeps keyboard focus inside while open.
 */
export function MobileNav({
  open,
  onClose,
  brand,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  brand: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open, onClose]);

  function trapTab(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    if (items.length === 0) return;
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

  return (
    <AnimatePresence>
      {/* pointer-events-none on the wrapper, as in NotificationPanel: a layer that
          outlives its exit animation must never swallow clicks on the page. */}
      {open && (
        <div className="pointer-events-none fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="pointer-events-auto absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            ref={panelRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onKeyDown={trapTab}
            className="pointer-events-auto absolute bottom-0 left-0 top-0 flex w-72 max-w-[85vw] flex-col bg-white p-4 shadow-2xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="flex items-center justify-between px-1">
              {brand}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Main" className="mt-5 flex flex-1 flex-col gap-1.5 overflow-y-auto">
              {children}
            </nav>
            {footer}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
