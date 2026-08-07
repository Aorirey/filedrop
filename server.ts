import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer, type Socket } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

type Room = {
  id: string;
  receiverId: string;
  senderId: string | null;
};

const rooms = new Map<string, Room>();
const socketRoom = new Map<string, string>();

function generateRoomId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  if (rooms.has(id)) return generateRoomId();
  return id;
}

function cleanupSocket(socket: Socket, io: SocketIOServer) {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  socketRoom.delete(socket.id);
  if (!room) return;

  if (room.receiverId === socket.id) {
    if (room.senderId) {
      io.to(room.senderId).emit("session-ended", { reason: "receiver-left" });
    }
    rooms.delete(roomId);
    return;
  }

  if (room.senderId === socket.id) {
    room.senderId = null;
    io.to(room.receiverId).emit("peer-left");
  }
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    const isHtml = /\.(?:html?)$/i.test(parsedUrl.pathname || "");
    if (isHtml || parsedUrl.pathname === "/") {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    socket.on("create-room", (ack?: (payload: { roomId: string }) => void) => {
      const roomId = generateRoomId();
      rooms.set(roomId, {
        id: roomId,
        receiverId: socket.id,
        senderId: null,
      });
      socketRoom.set(socket.id, roomId);
      socket.join(roomId);
      ack?.({ roomId });
    });

    socket.on(
      "join-room",
      (
        payload: { roomId: string },
        ack?: (result: { ok: true } | { ok: false; error: string }) => void
      ) => {
        const roomId = (payload?.roomId || "").toUpperCase().trim();
        const room = rooms.get(roomId);

        if (!room) {
          ack?.({ ok: false, error: "Комната не найдена" });
          return;
        }
        if (room.senderId) {
          ack?.({ ok: false, error: "К комнате уже подключён отправитель" });
          return;
        }
        if (room.receiverId === socket.id) {
          ack?.({ ok: false, error: "Нельзя подключиться к своей комнате" });
          return;
        }

        room.senderId = socket.id;
        socketRoom.set(socket.id, roomId);
        socket.join(roomId);
        io.to(room.receiverId).emit("peer-joined", { senderId: socket.id });
        ack?.({ ok: true });
      }
    );

    socket.on(
      "signal",
      (payload: {
        roomId: string;
        data: unknown;
      }) => {
        const room = rooms.get(payload?.roomId);
        if (!room) return;

        const targetId =
          socket.id === room.receiverId ? room.senderId : room.receiverId;
        if (!targetId) return;

        io.to(targetId).emit("signal", {
          from: socket.id,
          data: payload.data,
        });
      }
    );

    socket.on("disconnect", () => {
      cleanupSocket(socket, io);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Filedrop ready on http://${hostname}:${port}`);
  });
});
