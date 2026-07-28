// app/layout.tsx  — Server Component root layout (App Router)
import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000"),
  ),
  title: "HOVER｜只為經典而生",
  description:
    "探索 HOVER 服飾、帽款、襪子與包袋。以中性設計、舒適剪裁與簡約質感，讓每一件單品自在融入生活，陪你走過每個日常。",
  // 建置中：不進搜尋結果，但仍可正常瀏覽
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
    },
  },
  icons: {
    icon: [
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
    ],
    shortcut: "/icon-48.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// App Router 規定：<html> / <body> 只能放在 Server Component layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-hover-bg font-sans text-slate-900 antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
