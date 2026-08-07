import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("Socket is client-only");
  }
  if (!socket || socket.disconnected) {
    socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}
