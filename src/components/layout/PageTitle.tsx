"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const APP_NAME = "RX Vision";

/** "Team today · RX Vision": the page's own heading, then the product. */
export function titleFor(heading: string | null | undefined): string {
  const words = (heading ?? "").replace(/\s+/g, " ").trim();
  return words ? `${words} · ${APP_NAME}` : APP_NAME;
}

/** The words a page is called: its `data-page-title` if it sets one, else its h1. */
export function pageHeading(root: ParentNode = document): string | null {
  const named = root.querySelector<HTMLElement>("[data-page-title]");
  if (named?.dataset.pageTitle) return named.dataset.pageTitle;
  return root.querySelector("h1")?.textContent ?? null;
}

/**
 * U-2 (WCAG 2.4.2): every page has its own browser title, taken from the same words as its
 * heading, so tabs, history and screen readers can tell pages apart. Pages are client rendered
 * and many headings arrive with their data, so the title follows the heading as it appears.
 */
export function PageTitle() {
  const pathname = usePathname();
  useEffect(() => {
    const sync = () => {
      const next = titleFor(pageHeading());
      if (document.title !== next) document.title = next;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    // The framework writes its own <title> again after a navigation: follow that too.
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
