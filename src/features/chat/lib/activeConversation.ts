/**
 * Which conversation is open on screen, if any.
 *
 * The notifier lives in the dashboard shell and the messages page lives below it,
 * so the popup has no way to see what the page is showing. Without that, a message
 * you are looking at raises a popup about itself.
 *
 * Module state rather than context on purpose: this is read inside a socket
 * handler, where a stale closure over a context value would be the bug.
 */
let activeUserId: string | null = null;

export function setActiveConversation(userId: string | null): void {
  activeUserId = userId;
}

export function isConversationOnScreen(userId: string): boolean {
  return activeUserId !== null && activeUserId === userId;
}
