import Client from "./client";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata = buildPublicPageMetadata({
  title: "聯絡我們｜HOVER",
  description:
    "有任何商品、訂單或會員相關問題，歡迎透過 HOVER 聯絡我們表單與客服信箱取得協助。",
  path: "/contact",
  keywords: ["HOVER", "聯絡我們", "客服", "服飾品牌"],
});

export const revalidate = 60;

export default function ContactPage() {
  return <Client />;
}
