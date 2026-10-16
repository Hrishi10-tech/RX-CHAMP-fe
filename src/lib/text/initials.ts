/**
 * Two initials for an avatar: "Maya Reddy" -> "MR", "asha@x.com" -> "AX". Words
 * are split on spaces, @ and dots, and punctuation is ignored, so a name like
 * "Praveen (Super Admin)" reads "PS", not "P(".
 */
export function initialsOf(nameOrEmail: string): string {
  return (
    nameOrEmail
      .split(/[\s@.]+/)
      .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U"
  );
}
