"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
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

function formatAtmExpireDate(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}/${iso[2]}/${iso[3]}`;
  const slash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slash) {
    return `${slash[1]}/${String(slash[2]).padStart(2, "0")}/${String(slash[3]).padStart(2, "0")}`;
  }
  return s;
}

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
  const mobile = encodeThankYouImageUrl(
    page.imageMobile.url || page.imageDesktop.url,
  );

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

function isAtmPaymentMethod(method, title) {
  const m = `${method || ""} ${title || ""}`.toLowerCase();
  return m.includes("atm") || m.includes("vaccount") || m.includes("虛擬帳號");
}

function ThankYouContent({ page }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [atm, setAtm] = useState(null);
  const [status, setStatus] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [isAtmOrder, setIsAtmOrder] = useState(false);
  const [orderReady, setOrderReady] = useState(!orderId);
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
      const atmMethod = isAtmPaymentMethod(
        data?.payment_method,
        data?.payment_method_title,
      );
      setStatus(nextStatus);
      setOrderNumber(String(data?.number || data?.order_number || orderId || ""));
      setIsAtmOrder(atmMethod || Boolean(info.atm_account));

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

      if (atmMethod) {
        setAtm(null);
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
      setOrderReady(true);
      // 虛擬帳號尚未回寫時再試一次
      if (result === "empty" || result === "atm") {
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
  const isAtmPending = !isPaid && (isAtmOrder || !!atm);
  // 資料未就緒前不顯示衣服 icon，避免 ATM 頁先閃一下
  const showClothesIcon = orderReady && !isAtmPending;
  const displayOrderNo = orderNumber || orderId;

  return (
    <div className="bg-hover-bg">
      <div className="flex flex-col items-center px-6 pb-10 pt-16 text-center md:pt-20">
        {showClothesIcon ? (
          <HoverIcon name="orderComplete" size={140} alt="" />
        ) : null}
        <h1
          className={`${showClothesIcon ? "mt-10" : "mt-0"} text-[22px] font-bold text-black md:text-[24px]`}
        >
          感謝您的購買
        </h1>

        {!orderReady ? (
          <p className="mt-5 text-[14px] tracking-[0.04em] text-[#888]">
            訂單處理中…
          </p>
        ) : isAtmPending ? (
          <>
            {displayOrderNo ? (
              <p className="mt-5 text-[14px] tracking-[0.04em] text-[#888]">
                訂單 {displayOrderNo} 已成立，請於繳費期限內完成 ATM 轉帳。
              </p>
            ) : null}

            {atm ? (
              <div className="mt-8 w-full max-w-md border border-[#ddd] bg-white px-6 py-5 text-left text-[13px] text-black">
                <p className="mb-3 text-[15px] font-semibold">ATM 繳費資訊</p>
                <div className="space-y-2.5">
                  <p>
                    應付金額：
                    <span className="font-medium">
                      {formatProductPrice(atm.amount)}
                    </span>
                  </p>
                  <p>
                    銀行代碼：
                    {formatAtmBankLabel(atm.bank) || ATM_BANK_DISPLAY}
                  </p>
                  <p>
                    虛擬帳號：
                    <span className="tracking-wide">{atm.account}</span>
                  </p>
                  {atm.expire ? (
                    <p>繳費期限：{formatAtmExpireDate(atm.expire)}</p>
                  ) : null}
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-[#2a514d]">
                  付款資訊已寄送至您的 Email。
                </p>
              </div>
            ) : (
              <p className="mt-5 text-[14px] tracking-[0.04em] text-[#888]">
                正在取得 ATM 繳費資訊…
              </p>
            )}
          </>
        ) : (
          displayOrderNo && (
            <p className="mt-5 text-[14px] tracking-[0.04em] text-[#888]">
              訂單 {displayOrderNo} 已成立，訂單資訊將寄送至您的 Email。
            </p>
          )
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
