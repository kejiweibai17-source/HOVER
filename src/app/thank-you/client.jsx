"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import HoverIcon from "@/components/hover/HoverIcon";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/lib/cartStore";
import { clearCheckoutSession } from "@/lib/checkoutSession";
import {
  formatProductPrice,
  formatAtmBankLabel,
  ATM_BANK_DISPLAY,
} from "@/lib/utils";
import {
  FALLBACK_THANK_YOU_IMAGE,
  thankYouPageHasCustomImage,
  encodeThankYouImageUrl,
} from "@/lib/thankYouDefaults";

/** 已付款／進入出貨流程的狀態：不再顯示 ATM 繳費資訊 */
const PAID_STATUSES = new Set(["processing", "completed"]);

function ThankYouBanner({ page }) {
  const useCustom = thankYouPageHasCustomImage(page);
  const alt = page?.imageDesktop?.alt || "HOVER";

  if (!useCustom) {
    return (
      <div className="relative mx-auto aspect-[16/7] w-full max-w-[1400px] bg-[#e8e6e2] md:aspect-[16/6]">
        <Image
          src={FALLBACK_THANK_YOU_IMAGE}
          alt={alt}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
    );
  }

  const desktop = encodeThankYouImageUrl(page.imageDesktop.url);
  const mobile = encodeThankYouImageUrl(page.imageMobile.url || page.imageDesktop.url);

  return (
    <div className="relative mx-auto aspect-[16/7] w-full max-w-[1400px] bg-[#e8e6e2] md:aspect-[16/6]">
      <Image
        src={desktop}
        alt={alt}
        fill
        className="hidden object-cover md:block"
        sizes="100vw"
        priority
      />
      <Image
        src={mobile}
        alt=""
        fill
        className="object-cover md:hidden"
        sizes="100vw"
        priority
      />
    </div>
  );
}

function ThankYouContent({ page }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [atm, setAtm] = useState(null);
  const [status, setStatus] = useState("");
  const [statusChinese, setStatusChinese] = useState("");
  const clearCart = useCartStore((s) => s.clearCart);

  // 下單成功落地：清購物車與結帳草稿（含 ATM／刷卡從綠界導回）
  useEffect(() => {
    clearCheckoutSession();
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let retryTimer;
    let pollTimer;
    let pollCount = 0;

    const applyOrder = (data) => {
      const nextStatus = String(data?.status || "");
      const info = data?.payment_info || {};
      setStatus(nextStatus);
      setStatusChinese(data?.status_chinese || "");

      if (PAID_STATUSES.has(nextStatus)) {
        setAtm(null);
        return "paid";
      }

      if (info.atm_account) {
        setAtm({
          bank: info.bank_code || "",
          account: info.atm_account,
          expire: info.expire_date || "",
          amount: data.total,
        });
        return "atm";
      }

      setAtm(null);
      return nextStatus ? "ok" : "empty";
    };

    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!res.ok) return "empty";
        const data = await res.json();
        if (cancelled) return "empty";
        return applyOrder(data);
      } catch {
        /* 取號／回寫可能尚未完成 */
        return "empty";
      }
    };

    load().then((result) => {
      if (cancelled) return;
      // 虛擬帳號尚未回寫時再試一次
      if (result === "empty") {
        retryTimer = setTimeout(() => {
          load();
        }, 1500);
      }
      // 仍待付款時輪詢，模擬付款後刷新／停留本頁可更新為已付款
      if (result === "atm" || result === "empty") {
        pollTimer = setInterval(async () => {
          if (cancelled) return;
          pollCount += 1;
          const r = await load();
          if (r === "paid" || pollCount >= 40) {
            clearInterval(pollTimer);
          }
        }, 3000);
      }
    });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [orderId]);

  const isPaid = PAID_STATUSES.has(status);

  return (
    <div className="bg-hover-bg">
      <div className="flex flex-col items-center px-6 pb-10 pt-16 text-center md:pt-20">
        <HoverIcon name="orderComplete" size={140} alt="" />
        <h1 className="mt-10 text-[22px] font-bold text-black md:text-[24px]">
          感謝您的購買
        </h1>
        {orderId && (
          <p className="mt-5 text-[14px] tracking-[0.04em] text-[#888]">
            訂單編號 {orderId}
            {statusChinese ? ` · ${statusChinese}` : ""}
          </p>
        )}
        <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#666]">
          訂單通知會寄到您結帳時填寫的信箱。若您為會員，亦可至會員中心查看訂單。
        </p>

        {isPaid && (
          <div className="mt-8 w-full max-w-md border border-[#2a514d]/30 bg-white px-6 py-5 text-left text-[13px] text-black">
            <p className="mb-2 font-semibold tracking-[0.08em] text-[#2a514d]">
              付款已確認
            </p>
            <p>訂單狀態：{statusChinese || "處理中"}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-[#2a514d]">
              付款已完成，我們將依訂單順序安排出貨。
            </p>
            <Link
              href="/account?tab=orders"
              className="mt-4 inline-block text-[13px] text-[#2a514d] underline underline-offset-2"
            >
              前往會員中心查看訂單
            </Link>
          </div>
        )}

        {!isPaid && atm && (
          <div className="mt-8 w-full max-w-md border border-[#ddd] bg-white px-6 py-5 text-left text-[13px] text-black">
            <p className="mb-3 text-[15px] font-semibold">匯款資訊</p>
            <div className="space-y-2.5">
              <div className="flex justify-between gap-4">
                <span className="w-[100px] shrink-0 text-[#8a8a8a]">應付金額</span>
                <span className="font-medium">{formatProductPrice(atm.amount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="w-[100px] shrink-0 text-[#8a8a8a]">銀行</span>
                <span>{formatAtmBankLabel(atm.bank) || ATM_BANK_DISPLAY}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="w-[100px] shrink-0 text-[#8a8a8a]">虛擬帳號</span>
                <span className="tracking-wide">{atm.account}</span>
              </div>
              {atm.expire ? (
                <div className="flex justify-between gap-4">
                  <span className="w-[100px] shrink-0 text-[#8a8a8a]">繳費期限</span>
                  <span>{atm.expire}</span>
                </div>
              ) : null}
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-[#2a514d]">
              請於繳費期限內完成付款，逾期訂單將自動取消。
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-[#ddd]" />

      <ThankYouBanner page={page} />
    </div>
  );
}

export default function ThankYouClient({ page }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe0e5] border-t-[#2a514d]" />
        </div>
      }
    >
      <ThankYouContent page={page} />
    </Suspense>
  );
}
