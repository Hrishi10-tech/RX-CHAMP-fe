/**
 * "Where I came from", carried in the URL.
 *
 * Back links used to point at a fixed page chosen by role, which is wrong as soon as
 * a page can be reached from more than one place. The activity view has three
 * entrances — Team Management, a manager's own team, and the org → manager
 * drill-down — and it always went back to the first, so drilling down two levels and
 * pressing back dumped you on a page you had never visited, under the wrong label.
 *
 * Kept in the URL rather than read from history so a reload or a shared link still
 * knows the way back, and so the label can travel with it.
 */

export const RETURN_TO = "from";
export const RETURN_LABEL = "fromLabel";

/**
 * Appends the current location to a link, so the destination can offer a back link
 * to it. `label` is what that link should read.
 */
export function withReturnTo(href: string, from: string, label: string): string {
  const sep = href.includes("?") ? "&" : "?";
  return (
    `${href}${sep}${RETURN_TO}=${encodeURIComponent(from)}` +
    `&${RETURN_LABEL}=${encodeURIComponent(label)}`
  );
}

/** A stand-in origin to resolve paths against: only "does it stay here?" matters. */
const PROBE_ORIGIN = "https://rx-vision.invalid";

/**
 * `value` if it is a path on this site, else null. Only same-origin,
 * absolute-path values are honoured: the value comes off the URL, so anyone can
 * put anything in it, and without this check a crafted link could send the back
 * button (or the page after sign-in) to another site, an open redirect wearing a
 * breadcrumb. Refused:
 * - anything not starting with a single "/" (`//evil.test` is protocol-relative);
 * - any backslash, plain or encoded: browsers read `/\evil.test` as `//evil.test`;
 * - tabs, line breaks and other control characters, which URL parsing drops
 *   (`/<tab>/evil.test` is `//evil.test` too);
 * - anything that, resolved against this site, lands anywhere else.
 */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]|%5c/i.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PROBE_ORIGIN || url.pathname.startsWith("//")) return null;
  return value;
}

/**
 * Resolves the back link for a page: what the caller asked for, or the page's own
 * default when arriving fresh (a bookmark, a reload, a link from outside).
 */
export function resolveReturnTo(
  params: { get(name: string): string | null },
  fallback: { href: string; label: string },
): { href: string; label: string } {
  const href = params.get(RETURN_TO);
  const label = params.get(RETURN_LABEL);

  const safe = safeInternalPath(href);
  if (!safe) return fallback;
  return { href: safe, label: label?.trim() || fallback.label };
}
