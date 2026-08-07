"use client";

import { formatBytes } from "@/lib/format";
import type { ReceivedFile } from "@/lib/webrtc";

export function FileList({ files }: { files: ReceivedFile[] }) {
  return (
    <aside className="glass side-panel">
      <h2>Полученные файлы</h2>
      <p className="hint">Файлы приходят напрямую с телефона — на сервере они не хранятся.</p>
      {files.length === 0 ? (
        <p className="empty-state">Пока пусто. После отправки здесь появятся имена и кнопки скачивания.</p>
      ) : (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.id} className="glass-inset file-item">
              <div className="file-meta">
                <span className="name" title={file.name}>
                  {file.name}
                </span>
                <span className="size">{formatBytes(file.size)}</span>
              </div>
              <a className="btn btn-primary btn-sm" href={file.url} download={file.name}>
                Скачать
              </a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
