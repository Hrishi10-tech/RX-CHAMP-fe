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

/**
 * Only same-origin, absolute-path returns are honoured. The value comes off the URL,
 * so anyone can put anything in it — without this check a crafted link could point
 * the back button at another site, which is an open redirect wearing a breadcrumb.
 * `//evil.com` is rejected too: browsers read it as protocol-relative.
 */
function isInternalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
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

  if (!href || !isInternalPath(href)) return fallback;
  return { href, label: label?.trim() || fallback.label };
}
