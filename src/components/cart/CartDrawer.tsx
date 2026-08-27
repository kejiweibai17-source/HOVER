"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Minus, Plus } from "lucide-react";
import {
  useCartStore,
  selectOpen,
  selectItems,
  keyOf,
  type CartItem,
} from "@/lib/cartStore";
import { formatProductPrice } from "@/lib/utils";
import { shippingFeeFor, type ShippingSettings } from "@/lib/shippingDefaults";
import { useShippingSettings } from "@/lib/useShippingSettings";

const currency = (n: number) => formatProductPrice(n);

function calcTotals(items: CartItem[], shippingSettings: ShippingSettings) {
  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.price || 0) * (it.qty || 0),
    0,
  );
  const shipping = shippingFeeFor(subtotal, "711", shippingSettings);
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

function getVariantLines(item: CartItem): string[] {
  if (item.options) {
    return Object.values(item.options).filter(Boolean);
  }
  const parts = item.id.split("-");
  if (parts.length >= 2) {
    return parts.slice(-2);
  }
  return [];
}

export default function CartSheet() {
  const open = useCartStore(selectOpen);
  const close = useCartStore((s) => s.closeCart);
  const items = useCartStore(selectItems);
  const shippingSettings = useShippingSettings();

  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.removeItem);

  const router = useRouter();

  const { subtotal, total } = useMemo(
    () => calcTotals(items, shippingSettings),
    [items, shippingSettings],
  );

  const goCheckout = () => {
    if (!items.length) return;

    const mapped = items.map((it) => ({
      id: it.id,
      wcProductId: it.wcProductId ?? it.id,
      title: it.name,
      name: it.name,
      slug: it.slug,
      variant: it.options
        ? Object.values(it.options).filter(Boolean).join(" / ")
        : "",
      img: it.image,
      image: it.image,
      options: it.options,
      price: it.price,
      list: it.price,
      compareAt: it.price,
      qty: it.qty,
    }));

    try {
      sessionStorage.setItem("cart_items", JSON.stringify(mapped));
    } catch (err) {
      console.error("寫入 cart_items 失敗：", err);
    }

    close();
    router.push("/cart");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          <motion.aside
            className="fixed bottom-0 right-0 top-0 z-[9999999999999] flex w-full max-w-[420px] flex-col bg-[#efefef] shadow-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#ccc] px-6 py-5">
              <h2 className="text-[18px] font-bold text-black">購物車</h2>
              <button
                type="button"
                onClick={close}
                className="text-black transition-opacity hover:opacity-50"
                aria-label="關閉購物車"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-auto px-6" data-lenis-prevent>
              {items.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-20 text-[#888]">
                  <p>目前尚無商品</p>
                  <button
                    type="button"
                    onClick={close}
                    className="text-sm text-black underline underline-offset-4"
                  >
                    去逛逛
                  </button>
                </div>
              )}

              {items.map((it) => {
                const k = keyOf(it);
                const variants = getVariantLines(it);

                return (
                  <div
                    key={k}
                    className="relative border-b border-[#ccc] py-6"
                  >
                    <button
                      type="button"
                      onClick={() => remove(k)}
                      className="absolute right-0 top-6 text-black transition-opacity hover:opacity-50"
                      aria-label="移除商品"
                    >
                      <X size={16} strokeWidth={1.5} />
                    </button>

                    <div className="flex gap-4 pr-6">
                      {it.image && (
                        <div
                          className="relative shrink-0 overflow-hidden bg-white"
                          style={{ width: 90, aspectRatio: "3/4" }}
                        >
                          <Image
                            src={it.image}
                            alt={it.name || "Product Image"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="pr-4 text-[13px] font-bold uppercase leading-snug text-black">
                          {it.name}
                        </p>

                        {variants.map((line) => (
                          <p
                            key={line}
                            className="mt-1 text-[13px] text-black"
                          >
                            {line}
                          </p>
                        ))}

                        <p className="mt-2 text-[13px] font-medium text-black">
                          {currency(it.price)}
                        </p>

                        <div className="mt-3 flex h-[32px] w-[100px] items-center border border-black bg-[#efefef]">
                          <button
                            type="button"
                            className="flex h-full w-[32px] items-center justify-center text-black transition-colors hover:bg-black/5"
                            onClick={() => dec(k)}
                            aria-label="減少數量"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="flex-1 text-center text-[13px] font-medium text-black">
                            {it.qty}
                          </span>
                          <button
                            type="button"
                            disabled={
                              it.maxQty != null && it.qty >= it.maxQty
                            }
                            className={`flex h-full w-[32px] items-center justify-center text-black transition-colors ${
                              it.maxQty != null && it.qty >= it.maxQty
                                ? "cursor-not-allowed opacity-40"
                                : "hover:bg-black/5"
                            }`}
                            onClick={() => inc(k)}
                            aria-label="增加數量"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        {it.maxQty != null && it.qty >= it.maxQty && (
                          <p className="mt-1.5 text-[11px] text-[#c90000]">
                            已達庫存上限
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-[#ccc] px-6 py-6">
              {items.length > 0 && (
                <div className="mb-5 space-y-2.5 text-[14px] text-black">
                  <div className="flex items-center justify-between">
                    <span>小計</span>
                    <span>{currency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span>總計</span>
                    <span>{currency(total)}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                disabled={items.length === 0}
                onClick={goCheckout}
                className={`flex h-[48px] w-full items-center justify-center text-[15px] font-medium text-white transition-colors ${
                  items.length === 0
                    ? "cursor-not-allowed bg-[#2a514d]/40"
                    : "bg-[#2a514d] hover:bg-[#1e3d3a]"
                }`}
              >
                立即購買
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
