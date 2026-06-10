// app/layout.tsx  — Server Component root layout (App Router)
import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "HOVER",
  description: "HOVER 不被性別框架限制的日常服飾品牌",
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
