// app/layout.tsx  — Server Component root layout (App Router)
import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "HOVER 威爾特｜輕盈穩定的日常服飾選品",
  description:
    "探索 HOVER 新作與熱銷單品——上衣、帽款、襪品到包袋。以舒適剪裁與簡約質感，陪你依照生活節奏自在穿搭。全館滿 NT$2,000 享免運。",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

// App Router 規定：<html> / <body> 只能放在 Server Component layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-hover-bg font-sans text-slate-900 antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
