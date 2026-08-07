"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrPanel({
  url,
  roomId,
  statusLabel,
  waiting,
  error,
}: {
  url: string;
  roomId: string;
  statusLabel: string;
  waiting?: boolean;
  error?: string | null;
}) {
  return (
    <section className={`glass hero-panel${waiting ? " waiting" : ""}`}>
      <div className="hero-title-wrap">
        <h1 className="hero-title">Хотите отправить файлы?</h1>
        <p className="hero-kicker">Отсканируйте QR-код, чтобы подключиться</p>
      </div>
      <div className="qr-wrap">
        {url ? (
          <QRCodeSVG
            value={url}
            size={220}
            level="M"
            bgColor="transparent"
            fgColor="#080808"
            marginSize={0}
          />
        ) : (
          <div style={{ width: 220, height: 220 }} />
        )}
      </div>
      <div className="room-code" title="Код комнаты">
        {roomId || "······"}
      </div>
      {error ? (
        <p className="status-line error">{error}</p>
      ) : (
        <p className="status-line">
          Статус: <strong>{statusLabel}</strong>
        </p>
      )}
    </section>
  );
}