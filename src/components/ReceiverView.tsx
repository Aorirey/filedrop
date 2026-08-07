"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileList } from "@/components/FileList";
import { GlassShell } from "@/components/GlassShell";
import { QrPanel } from "@/components/QrPanel";
import { getSocket } from "@/lib/socket";
import {
  FileDropPeer,
  type ConnectionStatus,
  type ReceivedFile,
} from "@/lib/webrtc";

function statusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "idle":
      return "Подключение…";
    case "waiting":
      return "Ждём отправителя";
    case "signaling":
      return "Устанавливаем связь";
    case "connected":
      return "Подключено";
    case "failed":
      return "Ошибка соединения";
    case "ended":
      return "Сессия завершена";
    default:
      return status;
  }
}

export function ReceiverView() {
  const [roomId, setRoomId] = useState("");
  const [origin, setOrigin] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<ReceivedFile[]>([]);
  const peerRef = useRef<FileDropPeer | null>(null);
  const roomIdRef = useRef("");

  const sendUrl = useMemo(
    () => (origin && roomId ? `${origin}/s/${roomId}` : ""),
    [origin, roomId]
  );

  useEffect(() => {
    setOrigin(window.location.origin);
    const socket = getSocket();
    let disposed = false;

    const makePeer = (id: string) => {
      const peer = new FileDropPeer(
        "receiver",
        id,
        (data) => {
          socket.emit("signal", { roomId: id, data });
        },
        {
          onStatus: (s) => {
            if (!disposed) setStatus(s);
          },
          onError: (msg) => {
            if (!disposed) setError(msg);
          },
          onFileReceived: (file) => {
            if (!disposed) setFiles((prev) => [file, ...prev]);
          },
        }
      );
      peerRef.current = peer;
      return peer;
    };

    socket.emit("create-room", (payload: { roomId: string }) => {
      if (disposed) return;
      roomIdRef.current = payload.roomId;
      setRoomId(payload.roomId);
      setStatus("waiting");
      makePeer(payload.roomId);
    });

    const onPeerJoined = () => {
      if (disposed) return;
      setError(null);
      void peerRef.current?.startAsReceiver();
    };

    const onSignal = (payload: {
      data: Parameters<FileDropPeer["handleSignal"]>[0];
    }) => {
      void peerRef.current?.handleSignal(payload.data);
    };

    const onPeerLeft = () => {
      if (disposed) return;
      peerRef.current?.dispose();
      const id = roomIdRef.current;
      if (id) makePeer(id);
      setStatus("waiting");
    };

    socket.on("peer-joined", onPeerJoined);
    socket.on("signal", onSignal);
    socket.on("peer-left", onPeerLeft);

    return () => {
      disposed = true;
      socket.off("peer-joined", onPeerJoined);
      socket.off("signal", onSignal);
      socket.off("peer-left", onPeerLeft);
      peerRef.current?.dispose();
      peerRef.current = null;
      socket.disconnect();
    };
  }, []);

  return (
    <GlassShell>
      <div className="main-stage">
        <QrPanel
          url={sendUrl}
          roomId={roomId}
          statusLabel={statusLabel(status)}
          waiting={status === "waiting"}
          error={error}
        />
        <FileList files={files} />
      </div>
    </GlassShell>
  );
}
