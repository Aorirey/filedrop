"use client";

import { useCallback, useRef, useState } from "react";
import { formatBytes } from "@/lib/format";
import type { TransferProgress } from "@/lib/webrtc";

export function SenderPicker({
  disabled,
  sending,
  onSend,
  progress,
}: {
  disabled?: boolean;
  sending?: boolean;
  onSend: (files: File[]) => void;
  progress: TransferProgress[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [active, setActive] = useState(false);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }, []);

  return (
    <div>
      <div
        className={`dropzone${active ? " active" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setActive(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
      >
        <strong>Выберите файлы</strong>
        <span>Нажмите или перетащите сюда</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="file-list" style={{ marginTop: 14, maxHeight: 220 }}>
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="glass-inset file-item">
              <div className="file-meta">
                <span className="name">{file.name}</span>
                <span className="size">{formatBytes(file.size)}</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={sending}
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Убрать
              </button>
            </li>
          ))}
        </ul>
      )}

      {progress.length > 0 && (
        <ul className="file-list" style={{ marginTop: 14 }}>
          {progress.map((item) => {
            const pct = item.size ? Math.round((item.sent / item.size) * 100) : 0;
            return (
              <li key={item.id} className="glass-inset file-item" style={{ display: "block" }}>
                <div className="file-meta">
                  <span className="name">{item.name}</span>
                  <span className="size">
                    {item.status === "done"
                      ? "Отправлено"
                      : `${formatBytes(item.sent)} / ${formatBytes(item.size)}`}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled || sending || files.length === 0}
          onClick={() => {
            onSend(files);
            setFiles([]);
          }}
        >
          {sending ? "Отправка…" : "Отправить"}
        </button>
      </div>
    </div>
  );
}
