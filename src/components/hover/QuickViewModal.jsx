"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Heart,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import { useCartStore } from "@/lib/cartStore";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";

const DEFAULT_COLORS = [
  { label: "藍", hex: "#9ab3d4" },
  { label: "黑", hex: "#111111" },
  { label: "白", hex: "#ffffff" },
];

const SIZES = ["S", "M", "L", "XL"];

const SIZE_GUIDE = {
  headers: ["尺寸(公分)", "S", "M", "L", "XL"],
  rows: [
    ["肩寬", "41", "45.5", "48.5", "54"],
    ["胸寬", "48.5", "52", "55", "58.5"],
    ["衣長", "65", "69.5", "72", "76.5"],
    ["袖長", "18.5", "20", "21.5", "24"],
  ],
};

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[#e0e0e0]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="text-[14px] text-[#363636]">{title}</span>
        <span className="text-[18px] font-light leading-none text-[#363636]">
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[800px] pb-4 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function QuickViewModal({ product, onClose }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const hasItem = useWishlistStore((s) => s.hasItem);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const gallery =
    product?.gallery?.length > 0
      ? product.gallery
      : product
        ? [product.image]
        : [];

  const colors =
    product?.colors?.length > 0
      ? product.colors
      : product
        ? [{ label: product.colorLabel, hex: product.colorHex }]
        : DEFAULT_COLORS;

  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [adding, setAdding] = useState(false);

  const productId = product?.id ?? "";
  const isSaved = product ? hasItem(productId) : false;
  const slug = product?.href?.replace(/^\/products\//, "") || String(productId);

  useEffect(() => {
    if (!product) return;
    setActiveIdx(0);
    setSelectedColor(product.colorLabel || colors[0]?.label || "");
    setSelectedSize(null);
    setQty(1);
    setAdding(false);
  }, [product, colors]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [product, onClose]);

  if (!product) return null;

  const displayPrice = product.salePrice ?? product.originalPrice;
  const hasDiscount =
    product.salePrice && product.originalPrice > product.salePrice;

  const handleAddToCart = () => {
    if (product.soldOut || !selectedSize) return;
    setAdding(true);
    addItem({
      id: `${product.id}-${selectedColor}-${selectedSize}`,
      name: product.name,
      price: displayPrice,
      qty,
      image: gallery[0] || product.image,
      options: { 顏色: selectedColor, 尺寸: selectedSize },
    });
    setTimeout(() => {
      setAdding(false);
      onClose();
    }, 600);
  };

  const handleToggleWishlist = async () => {
    if (wishlistPending) return;
    setWishlistPending(true);
    const loggedIn = await checkAuth();
    setWishlistPending(false);
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent("/account?tab=favorites")}`);
      return;
    }
    toggleItem({
      id: productId,
      slug,
      name: product.name,
      price: String(displayPrice),
      image: gallery[0] || product.image,
    });
  };

  const detailText =
    product.description ||
    "短袖T恤帶有單色刺繡的微妙口音。使用的球衣材料具有細膩的質地，增強了物品的吸引力，儘管它具有休閒性質，但給人一種優雅的印象。";

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal — centered mini product page */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            className="relative z-10 flex max-h-[90vh] w-full max-w-[980px] flex-col overflow-hidden bg-hover-bg shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              className="absolute right-4 top-4 z-20 text-black transition-opacity hover:opacity-60"
            >
              <X size={22} strokeWidth={1.5} />
            </button>

            {/* Scrollable body — same 2-col layout as PDP */}
            <div
              className="overflow-y-auto overscroll-contain"
              data-lenis-prevent
            >
              <div className="flex flex-col gap-6 p-6 pt-12 md:flex-row md:items-start md:gap-8 md:p-8 md:pt-10">
                {/* Left: gallery */}
                <div className="w-full shrink-0 md:w-[48%]">
                  <div
                    className="relative w-full overflow-hidden bg-[#e8e6e2]"
                    style={{ aspectRatio: "3/4" }}
                  >
                    <Image
                      key={gallery[activeIdx]}
                      src={gallery[activeIdx]}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 440px"
                    />
                    {gallery.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveIdx((i) =>
                              i === 0 ? gallery.length - 1 : i - 1,
                            )
                          }
                          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center bg-[rgba(42,81,77,0.25)] text-white transition-colors hover:bg-[rgba(42,81,77,0.55)]"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveIdx((i) =>
                              i === gallery.length - 1 ? 0 : i + 1,
                            )
                          }
                          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center bg-[rgba(42,81,77,0.25)] text-white transition-colors hover:bg-[rgba(42,81,77,0.55)]"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  {gallery.length > 1 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {gallery.slice(0, 4).map((src, i) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setActiveIdx(i)}
                          className={`relative overflow-hidden border-2 transition-colors ${
                            activeIdx === i
                              ? "border-[#2a514d]"
                              : "border-transparent"
                          }`}
                          style={{ aspectRatio: "3/4" }}
                        >
                          <Image
                            src={src}
                            alt={`${product.name} ${i + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: product info */}
                <div className="w-full md:w-[52%]">
                  <p className="mb-1 text-[11px] tracking-[0.15em] text-[#888]">
                    {product.category}
                  </p>

                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 className="text-[18px] font-bold uppercase leading-snug text-black md:text-[20px]">
                      {product.name}
                    </h2>
                    <button
                      type="button"
                      aria-label={isSaved ? "取消收藏" : "加入收藏"}
                      onClick={handleToggleWishlist}
                      disabled={wishlistPending}
                      className={`mt-0.5 shrink-0 transition-colors ${
                        isSaved ? "text-rose-500" : "text-black hover:text-rose-400"
                      }`}
                    >
                      <Heart
                        size={20}
                        strokeWidth={1.5}
                        fill={isSaved ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="mb-5 flex items-center gap-3">
                    {product.soldOut ? (
                      <span className="text-[18px] font-bold text-[#222]">
                        SOLD OUT
                      </span>
                    ) : (
                      <>
                        {hasDiscount && (
                          <span className="text-[16px] font-bold text-black line-through opacity-50">
                            NT$ {product.originalPrice.toLocaleString()}
                          </span>
                        )}
                        <span
                          className={`text-[18px] font-bold ${
                            hasDiscount ? "text-[#c90000]" : "text-black"
                          }`}
                        >
                          NT$ {displayPrice.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Color */}
                  <div className="mb-4">
                    <p className="mb-2 text-[13px] text-black">
                      {selectedColor}
                    </p>
                    <div className="flex gap-2.5">
                      {colors.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          aria-label={c.label}
                          onClick={() => setSelectedColor(c.label)}
                          className={`relative h-[32px] w-[32px] border-2 transition-all ${
                            selectedColor === c.label
                              ? "scale-110 border-black"
                              : "border-transparent hover:border-[#999]"
                          } ${c.label === "白" ? "border border-[#ccc]" : ""}`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Size */}
                  {!product.soldOut && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {SIZES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSize(s)}
                            className={`flex h-[36px] w-[50px] items-center justify-center border text-[14px] font-bold transition-colors ${
                              selectedSize === s
                                ? "border-black bg-black text-white"
                                : "border-black bg-transparent text-black hover:bg-black/5"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      {!selectedSize && (
                        <p className="mt-2 text-[11px] text-[#c90000]">
                          請選擇尺寸
                        </p>
                      )}
                    </div>
                  )}

                  <p className="mb-4 text-[13px] text-[#2a514d]">
                    UNISEX(男女皆適穿)
                  </p>

                  {/* Qty */}
                  {!product.soldOut && (
                    <div className="mb-4">
                      <div className="flex h-[36px] w-[140px] items-center border border-black">
                        <button
                          type="button"
                          onClick={() => setQty((q) => Math.max(1, q - 1))}
                          className="flex h-full w-[36px] items-center justify-center hover:bg-black/5"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-center text-[14px] font-medium">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty((q) => q + 1)}
                          className="flex h-full w-[36px] items-center justify-center hover:bg-black/5"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={product.soldOut || !selectedSize}
                    className={`mb-5 flex h-[40px] w-full items-center justify-center text-[14px] text-white transition-all ${
                      !product.soldOut && selectedSize
                        ? "bg-[#2a514d] hover:bg-[#1e3d3a]"
                        : "cursor-not-allowed bg-[#2a514d]/50"
                    } ${adding ? "scale-95" : ""}`}
                  >
                    {product.soldOut
                      ? "已售完"
                      : adding
                        ? "已加入購物車 ✓"
                        : "加入購物車"}
                  </button>

                  <Link
                    href={product.href}
                    onClick={onClose}
                    className="mb-6 block w-full border border-black py-2.5 text-center text-[13px] font-semibold tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white"
                  >
                    查看完整商品
                  </Link>

                  {/* Accordions — compact PDP sections */}
                  <Accordion title="商品詳情" defaultOpen>
                    <div className="space-y-2 text-[13px] leading-[1.8] tracking-wide text-black">
                      {detailText.split("\n").map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </Accordion>

                  <Accordion title="洗滌方式">
                    <div className="space-y-1.5 text-[13px] leading-[1.8] tracking-wide text-black">
                      <p>・建議手洗或機洗冷水輕柔模式</p>
                      <p>・請勿使用漂白劑</p>
                      <p>・請勿烘乾</p>
                      <p>・可低溫熨燙（最高 110°C）</p>
                    </div>
                  </Accordion>

                  <Accordion title="尺寸指南">
                    <div className="overflow-x-auto text-[12px]">
                      <table className="w-full min-w-[320px] border-collapse">
                        <thead>
                          <tr className="border-b border-[#ddd]">
                            {SIZE_GUIDE.headers.map((h) => (
                              <th
                                key={h}
                                className="py-1.5 pr-3 text-left font-medium text-[#555]"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {SIZE_GUIDE.rows.map(([label, ...vals]) => (
                            <tr key={label} className="border-b border-[#eee]">
                              <td className="py-1.5 pr-3 font-medium text-[#333]">
                                {label}
                              </td>
                              {vals.map((v, i) => (
                                <td key={i} className="py-1.5 pr-3 text-[#555]">
                                  {v}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Accordion>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
