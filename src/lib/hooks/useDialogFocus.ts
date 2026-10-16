"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** What Tab can reach inside `root`, in order: skips hidden and disabled things. */
export function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.closest("[hidden], [inert], [aria-hidden='true']")) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

/**
 * Keyboard focus for a modal dialog, as a dialog should behave:
 * - when it opens, focus moves in (to `[data-autofocus]`, else the first thing
 *   Tab can reach, else the dialog itself);
 * - while it is open, Tab and Shift+Tab wrap around inside it, and focus that
 *   lands outside it (a click on the page behind) is brought back;
 * - when it closes, focus goes back to whatever had it before (the button that
 *   opened it), so keyboard and screen-reader users keep their place.
 * Escape stays with the dialog, which knows how to close itself.
 */
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;

    const first = () => {
      const root = ref.current;
      if (!root) return null;
      return root.querySelector<HTMLElement>("[data-autofocus]") ?? focusablesIn(root)[0] ?? root;
    };
    const frame = requestAnimationFrame(() => first()?.focus());

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const root = ref.current;
      if (!root) return;
      const items = focusablesIn(root);
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const active = document.activeElement;
      const head = items[0];
      const tail = items[items.length - 1];
      const outside = !active || !root.contains(active);
      if (e.shiftKey && (active === head || outside)) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && (active === tail || outside)) {
        e.preventDefault();
        head.focus();
      }
    }

    function onFocusIn(e: FocusEvent) {
      const root = ref.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) first()?.focus();
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open, ref]);
}
