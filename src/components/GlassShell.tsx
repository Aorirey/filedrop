"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function GlassShell({
  children,
  brandHref = "/",
}: {
  children: ReactNode;
  brandHref?: string;
}) {
  return (
    <>
      <div className="atmosphere" aria-hidden />
      <div className="main-wrapper">
        {/* Decorative floating images from reference design */}
        <img
          className="glass_img-top"
          src="/helix.png"
          alt=""
          aria-hidden
        />
        <img
          className="glass_img-bottom"
          src="/pyramid.png"
          alt=""
          aria-hidden
        />
        <div className="app-shell">
          <header className="topbar">
            <Link href={brandHref} className="brand">
              File<span>drop</span>
            </Link>
            <Link
              href="/menu"
              className="icon-link"
              aria-label="Меню"
              title="Меню"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h16M4 12h16M4 17h10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </header>
          {children}
        </div>
      </div>
    </>
  );
}