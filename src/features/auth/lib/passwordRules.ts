/** Shortest password the API accepts (create, set and change). It enforces this too. */
export const MIN_PASSWORD_LENGTH = 8;

/** Longest the API accepts. */
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_RULE = `At least ${MIN_PASSWORD_LENGTH} characters.`;

/**
 * Why a new password would be refused, or null when it is fine. Mirrors the
 * server's only rule (length), so the form never rejects something the API would
 * take, and never lets through something it would refuse.
 */
export function newPasswordProblem(password: string): string | null {
  if (!password) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH)
    return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}
