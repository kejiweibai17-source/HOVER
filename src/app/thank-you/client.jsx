"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import HoverIcon from "@/components/hover/HoverIcon";
import { useSearchParams } from "next/navigation";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [atm, setAtm] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let timer;

    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!res.ok) return false;
        const data = await res.json();
        const info = data.payment_info || {};
        if (!cancelled && info.atm_account) {
          setAtm({
            bank: info.bank_code || "",
            account: info.atm_account,
            expire: info.expire_date || "",
            amount: data.total,
          });
          return true;
        }
      } catch {
        /* 取號資料可能尚未回寫 */
      }
      return false;
    };

    load().then((ok) => {
      if (!ok && !cancelled) timer = setTimeout(load, 1500);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

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
          </p>
        )}
        <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#666]">
          訂單通知會寄到您結帳時填寫的信箱。若您為會員，亦可至會員中心查看訂單。
        </p>

        {atm && (
          <div className="mt-8 w-full max-w-md border border-[#ddd] bg-white px-6 py-5 text-left text-[13px] text-black">
            <p className="mb-3 font-semibold tracking-[0.08em]">ATM 繳費資訊</p>
            <p>應付金額：NT$ {atm.amount}</p>
            <p>銀行代碼：{atm.bank}</p>
            <p>虛擬帳號：{atm.account}</p>
            {atm.expire ? <p>繳費期限：{atm.expire}</p> : null}
            <p className="mt-3 text-[12px] text-[#888]">
              相同資訊已寄到您的信箱，請於期限內完成轉帳。
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-[#ddd]" />

      <div className="relative mx-auto aspect-[16/7] w-full max-w-[1400px] bg-[#e8e6e2] md:aspect-[16/6]">
        <Image
          src="/images/hover/pdp-main-1.jpg"
          alt="HOVER"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
    </div>
  );
}

export default function ThankYouClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe0e5] border-t-[#2a514d]" />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
