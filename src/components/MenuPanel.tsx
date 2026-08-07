"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function MenuPanel() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onJoin(e: FormEvent) {
    e.preventDefault();
    const roomId = code.trim().toUpperCase();
    if (!roomId) return;
    router.push(`/s/${roomId}`);
  }

  return (
    <section className="glass menu-page">
      <h1>Меню</h1>
      <p className="lead">
        Filedrop передаёт файлы напрямую между устройствами через WebRTC. Сервер
        только помогает установить соединение по QR-коду.
      </p>

      <ul className="menu-list">
        <li>
          <Link href="/" className="menu-item">
            <strong>Стать получателем</strong>
            <span>Открыть комнату с QR-кодом на этом устройстве</span>
          </Link>
        </li>
        <li>
          <div className="menu-item">
            <strong>Открыть как отправитель</strong>
            <span>Введите код с экрана получателя, если QR недоступен</span>
            <form className="code-form" onSubmit={onJoin}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="КОД"
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect="off"
              />
              <button type="submit" className="btn btn-primary">
                Войти
              </button>
            </form>
          </div>
        </li>
        <li>
          <div className="menu-item">
            <strong>О сервисе</strong>
            <span>
              Файлы не сохраняются на сервере. На сложных сетях (корпоративный
              NAT) соединение может не установиться без TURN — это ограничение MVP.
            </span>
          </div>
        </li>
      </ul>
    </section>
  );
}
