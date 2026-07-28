import { Metadata } from "next";
import Link from "next/link";

export const revalidate = 60;

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "資料刪除說明｜HOVER",
  description:
    "說明如何申請刪除 HOVER 透過 Facebook 登入所取得的個人資料。",
  alternates: { canonical: "/data-deletion" },
  // Facebook App 審核會驗證此網址；其餘頁面仍維持 noindex
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <div className="relative bg-white pb-24">
      <div className="mx-auto max-w-[720px] px-5 pt-16 md:px-8 md:pt-24">
        <p className="mb-3 text-[12px] tracking-[0.2em] text-[#999]">HOVER</p>
        <h1 className="mb-4 text-[28px] font-semibold tracking-[0.08em] text-[#2a514d] md:text-[34px]">
          資料刪除說明
        </h1>
        <p className="mb-10 text-[13px] leading-[2] tracking-[0.04em] text-[#555] md:text-[14px]">
          若您曾使用 Facebook 登入 HOVER
          官方網站，並希望刪除我們透過該登入方式取得的個人資料，請依下列方式提出申請。
        </p>

        <section className="mb-8 space-y-3 border-t border-[#e8e8e8] pt-8">
          <h2 className="text-[16px] font-medium tracking-[0.06em] text-[#2a514d]">
            申請方式
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-[2] tracking-[0.04em] text-[#555] md:text-[14px]">
            <li>
              寄信至客服信箱：
              <a
                href="mailto:service@hoverofficial.com"
                className="text-[#2a514d] underline underline-offset-2"
              >
                service@hoverofficial.com
              </a>
            </li>
            <li>主旨請註明「Facebook 資料刪除申請」。</li>
            <li>
              請提供您的 Facebook 帳號綁定 Email，以及註冊／登入時使用的
              Email（若不同）。
            </li>
            <li>
              我們將於收到申請後 7
              個工作天內完成確認，並依相關法令與內部程序處理資料刪除。
            </li>
          </ol>
        </section>

        <section className="mb-8 space-y-3 border-t border-[#e8e8e8] pt-8">
          <h2 className="text-[16px] font-medium tracking-[0.06em] text-[#2a514d]">
            將刪除的資料範圍
          </h2>
          <ul className="space-y-2 text-[13px] leading-[2] tracking-[0.04em] text-[#555] md:text-[14px]">
            <li>・透過 Facebook 登入取得的姓名、Email、大頭貼等公開基本資料</li>
            <li>・與該 Facebook 登入關聯之 HOVER 會員帳號綁定資訊</li>
            <li>
              ・依法必須保留之訂單／交易／發票等紀錄，可能依法令另行保存，不會用於其他行銷用途
            </li>
          </ul>
        </section>

        <section className="mb-10 space-y-3 border-t border-[#e8e8e8] pt-8">
          <h2 className="text-[16px] font-medium tracking-[0.06em] text-[#2a514d]">
            相關政策
          </h2>
          <p className="text-[13px] leading-[2] tracking-[0.04em] text-[#555] md:text-[14px]">
            更多個人資料處理細節，請參閱{" "}
            <Link
              href="/privacy"
              className="text-[#2a514d] underline underline-offset-2"
            >
              隱私權政策
            </Link>
            。
          </p>
        </section>
      </div>
    </div>
  );
}
