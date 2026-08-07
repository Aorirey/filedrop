"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GlassShell } from "@/components/GlassShell";
import { SenderPicker } from "@/components/SenderPicker";
import { getSocket } from "@/lib/socket";
import {
  FileDropPeer,
  type ConnectionStatus,
  type TransferProgress,
} from "@/lib/webrtc";

function statusLabel(status: ConnectionStatus, joinError?: string | null) {
  if (joinError) return joinError;
  switch (status) {
    case "idle":
      return "Подключение к комнате…";
    case "signaling":
      return "Устанавливаем P2P…";
    case "connected":
      return "Готово к отправке";
    case "failed":
      return "Не удалось соединиться";
    case "ended":
      return "Сессия завершена";
    case "waiting":
      return "Ожидание…";
    default:
      return status;
  }
}

export default function SenderPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = (params.roomId || "").toUpperCase();
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<TransferProgress[]>([]);
  const peerRef = useRef<FileDropPeer | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    let disposed = false;

    const peer = new FileDropPeer(
      "sender",
      roomId,
      (data) => {
        socket.emit("signal", { roomId, data });
      },
      {
        onStatus: setStatus,
        onError: setError,
        onSendProgress: (item) => {
          setProgress((prev) => {
            const idx = prev.findIndex((p) => p.id === item.id);
            if (idx === -1) return [...prev, item];
            const next = [...prev];
            next[idx] = item;
            return next;
          });
        },
      }
    );
    peerRef.current = peer;

    socket.emit(
      "join-room",
      { roomId },
      (result: { ok: true } | { ok: false; error: string }) => {
        if (disposed) return;
        if (!result.ok) {
          setJoinError(result.error);
          setStatus("failed");
          return;
        }
        setStatus("signaling");
      }
    );

    const onSignal = (payload: {
      data: Parameters<FileDropPeer["handleSignal"]>[0];
    }) => {
      void peer.handleSignal(payload.data);
    };

    const onEnded = () => {
      setStatus("ended");
      setError("Получатель закрыл сессию");
    };

    socket.on("signal", onSignal);
    socket.on("session-ended", onEnded);

    return () => {
      disposed = true;
      socket.off("signal", onSignal);
      socket.off("session-ended", onEnded);
      peer.dispose();
      peerRef.current = null;
      socket.disconnect();
    };
  }, [roomId]);

  async function handleSend(files: File[]) {
    if (!peerRef.current || files.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await peerRef.current.sendFiles(files);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  const ready = status === "connected" && !joinError;

  return (
    <GlassShell>
      <section className="glass sender-stage">
        <h1>Отправка файлов</h1>
        <p className="lead">
          Комната <strong style={{ color: "var(--blue-violet)", letterSpacing: "0.12em" }}>{roomId}</strong>
          {" · "}
          {statusLabel(status, joinError)}
        </p>
        {(error || joinError) && (
          <p className="status-line error" style={{ marginBottom: 16 }}>
            {error || joinError}
          </p>
        )}
        <SenderPicker
          disabled={!ready}
          sending={sending}
          onSend={handleSend}
          progress={progress}
        />
      </section>
    </GlassShell>
  );
}
