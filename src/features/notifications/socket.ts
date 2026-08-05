import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export function createNotificationsSocket(): Socket {
  return io(`${SOCKET_URL}/notifications`, {
    withCredentials: true,
    transports: ["websocket"],
    autoConnect: false,
  });
}
