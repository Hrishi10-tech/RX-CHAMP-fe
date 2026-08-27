import type { Screenshot } from "@/features/screenshots/types";

/**
 * Whether two entries are the same capture.
 *
 * `id` is optional on the type and the API does not always send it, so matching
 * on it alone makes every id-less capture equal to every other one. The URL is
 * always present and unique per capture, which is what makes it the fallback.
 */
export function sameScreenshot(a: Screenshot, b: Screenshot): boolean {
  return a.id && b.id ? a.id === b.id : a.url === b.url;
}

/** Position of a capture in a list, or -1. Used to drive the lightbox arrows. */
export function indexOfScreenshot(list: Screenshot[], shot: Screenshot | null): number {
  return shot ? list.findIndex((s) => sameScreenshot(s, shot)) : -1;
}
