/** A text as presets are compared: trimmed, single spaces, case ignored. */
function presetKey(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Whether a reason is enough (3.2, the same rule as the API): at least `minChars`
 * long, or one of the quick answers picked as it is, whatever its length.
 */
export function reasonAccepted(
  text: string,
  minChars: number,
  presets: readonly string[],
): boolean {
  const t = text.trim();
  if (t.length >= minChars) return true;
  const key = presetKey(t);
  return key.length > 0 && presets.some((p) => presetKey(p) === key);
}
