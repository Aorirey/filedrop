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
      <p className="hero-kicker">Получатель</p>
      <h1 className="hero-title">Отсканируйте QR</h1>
      <div className="qr-wrap">
        {url ? (
          <QRCodeSVG
            value={url}
            size={220}
            level="M"
            bgColor="transparent"
            fgColor="#0a1218"
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
