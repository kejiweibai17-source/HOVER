import Client from "./client";

// /app/photos/metadata.js
// /app/news/metadata.js
// /app/about/metadata.js
export const metadata = {
  title: "關於 UFLOW｜科學實證保健食品品牌｜研發理念、第三方檢驗與永續承諾",
  description:
    "UFLOW 專注於以科學為本的保健食品與日常營養補給。從原料溯源、配方研發到第三方檢驗與永續包裝，我們以更透明的方式，陪伴每一次有效的日常補給。",
  keywords: [
    "關於 UFLOW",
    "保健食品品牌",
    "營養補充品",
    "第三方檢驗",
    "原料溯源",
    "功能性營養",
    "研發理念",
    "永續包裝",
    "UFLOW",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "https://www.uflow.space/about",
    siteName: "UFLOW 功能性保健食品",
    title: "關於 UFLOW｜科學實證保健食品品牌｜研發理念、第三方檢驗與永續承諾",
    description:
      "我們相信每一份補給都應該有根據、能感受、且對地球友善。了解 UFLOW 的品牌故事、研發流程與品質保證。",
    images: [
      {
        url: "https://www.uflow.space/images/og/about-og.jpg",
        width: 1200,
        height: 630,
        alt: "UFLOW 品牌形象與研發理念封面",
      },
    ],
  },
  alternates: {
    canonical: "https://www.uflow.space/about",
  },
};

export const revalidate = 60;

export default function QaPage() {
  return <Client />;
}
