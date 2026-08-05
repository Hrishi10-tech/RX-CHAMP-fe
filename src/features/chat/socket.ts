import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export function createChatSocket(): Socket {
  return io(`${SOCKET_URL}/chat`, {
    withCredentials: true,
    transports: ["websocket"],
    autoConnect: false,
  });
}
