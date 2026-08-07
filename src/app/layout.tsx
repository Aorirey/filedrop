import type { Metadata } from "next";
import { Outfit, Sora } from "next/font/google";
import "@/styles/globals.css";

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Filedrop — обмен файлами P2P",
  description:
    "Откройте сайт на компьютере, отсканируйте QR с телефона и отправьте файлы напрямую.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${sora.variable} ${outfit.variable}`}>{children}</body>
    </html>
  );
}
