import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";

const yulong = localFont({
  src: [
    {
      path: "../../fonts/Yulong-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/Yulong-Regular.woff",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-yulong",
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
      <body className={yulong.variable}>{children}</body>
    </html>
  );
}