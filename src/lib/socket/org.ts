import type { Socket } from "socket.io-client";

import { orgHeaderValue, subscribeOrg } from "@/lib/org/selection";

/**
 * A Super Admin's sockets join the selected organisation's rooms at handshake
 * time (`auth.orgId`, see `socketAuth`), so switching organisation needs a new
 * handshake: reconnect when the selection changes. Nothing happens for other
 * roles, whose selection is always empty. Returns the unsubscribe.
 */
export function attachOrgReconnect(socket: Socket): () => void {
  let current = orgHeaderValue();
  return subscribeOrg(() => {
    const next = orgHeaderValue();
    if (next === current) return;
    current = next;
    // A socket the page has let go of stays closed.
    if (!socket.connected && !socket.active) return;
    socket.disconnect();
    socket.connect();
  });
}
