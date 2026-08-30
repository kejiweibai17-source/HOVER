// app/account/page.jsx
"use client";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useWishlistStore } from "@/lib/wishlistStore";
import {
  formatProductPrice,
  formatShippingMethodLabel,
  formatAtmBankLabel,
} from "@/lib/utils";
import {
  invoicePreferenceFromOrderMeta,
  getInvoiceTypeLabel,
  getInvoiceTypeDetail,
} from "@/lib/invoicePreference";
import { motion, AnimatePresence } from "framer-motion";
import HoverIcon from "@/components/hover/HoverIcon";
import WishlistIcon from "@/components/hover/WishlistIcon";
import { PasswordInput } from "@/components/hover/AuthField";
import { useShippingSettings } from "@/lib/useShippingSettings";
import {
  getOrderStatusLabel as resolveOrderStatusLabel,
  resolveOrderAction,
  getOrderActionLabel,
  getOrderActionHref,
  getOrderActionVariant,
  buildReturnLineUrl,
  buildReturnLineQrImageUrl,
  buildReturnLineBridgePath,
} from "@/lib/orderActions";
import {
  Home,
  Package,
  Tag,
  Settings,
  Bell,
  ChevronLeft,
  ChevronDown,
  Copy,
  ExternalLink,
  Circle,
  LogOut,
  X,
  Crown,
  ShieldCheck,
  Zap,
  CreditCard,
  Calendar,
  Info,
  Landmark,
  ChevronRight,
} from "lucide-react";

// ============================================================================
// Utils
// ============================================================================
function cn(...arr) {
  return arr.filter(Boolean).join(" ");
}
function formatMoneyNT(n) {
  return formatProductPrice(n);
}
function formatMoneyDot(n) {
  return formatProductPrice(n);
}
function formatOrderDate(value, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (!withTime) return `${y}/${m}/${day}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")} ${hh}:${mm}`;
}
function getOrderStatusLabel(orderOrStatus) {
  if (orderOrStatus && typeof orderOrStatus === "object") {
    return resolveOrderStatusLabel(orderOrStatus);
  }
  return resolveOrderStatusLabel({ status: orderOrStatus });
}
function getPaymentStatusLabel(order) {
  const s = String(order?.status || "").toLowerCase();
  if (s === "pending" || s === "on-hold" || s === "waiting-payment" || s === "待付款")
    return "待付款";
  if (s === "cancelled" || s === "canceled" || s === "failed") return "未付款";
  if (s === "refunded") return "已退款";
  if (order?.date_paid || s === "processing" || s === "completed" || s === "paid")
    return "已付款";
  return "—";
}
function getMetaValue(metaData, keys = []) {
  if (!Array.isArray(metaData)) return "";
  const wanted = keys.map((k) => String(k).toLowerCase());
  for (const item of metaData) {
    const key = String(item?.key || "").toLowerCase();
    if (!wanted.some((k) => key === k || key.endsWith(k))) continue;
    const val = Array.isArray(item.value) ? item.value[0] : item.value;
    const str = String(val ?? "").trim();
    if (str) return str;
  }
  return "";
}
function getItemVariantText(item) {
  const metas = Array.isArray(item?.meta_data) ? item.meta_data : [];
  const sizeKeys = /尺寸|size|pa_size|pa_尺寸/i;
  const colorKeys = /顏色|color|colour|pa_color|pa_顏色|pa_colour/i;
  const skipKeys = /^(variant|_reduced_stock|數量|qty|quantity)$/i;

  let size = "";
  let color = "";
  const extras = [];

  for (const m of metas) {
    const key = String(m?.key || "").trim();
    const raw = String(m?.value || "").trim();
    if (!raw || skipKeys.test(key)) continue;

    if (sizeKeys.test(key) && !size) {
      size = raw;
      continue;
    }
    if (colorKeys.test(key) && !color) {
      color = raw;
      continue;
    }

    // 合併欄位（如 "S / 黑"）
    if (/variant|規格|選項/i.test(key) || /\s*\/\s*/.test(raw)) {
      const parts = raw
        .split(/\s*\/\s*|\s*,\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const p of parts) {
        if (!size && /^[XSML]{1,3}$/i.test(p)) size = p;
        else if (!color && !/^\d+$/.test(p)) color = color || p;
        else if (p !== size && p !== color) extras.push(p);
      }
      continue;
    }

    if (!/^\d+$/.test(raw)) extras.push(raw);
  }

  const parts = [size, color, ...extras].filter(Boolean);
  // 去重（保留順序）
  const seen = new Set();
  const unique = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(p);
  }
  return unique.join(" / ");
}

/** 商品名若已含尺寸／顏色，剝掉以免與第二行重複 */
function getItemDisplayName(item) {
  const name = String(item?.name || "").trim();
  const variant = getItemVariantText(item);
  if (!name || !variant) return name;
  const esc = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s*\/\s*/g, "\\s*[\\/,]\\s*");
  return name
    .replace(new RegExp(`\\s*[\\-–—]?\\s*${esc}\\s*$`, "i"), "")
    .replace(/\s*[\-–—]\s*$/, "")
    .trim() || name;
}

const formatNTD = (val) => formatProductPrice(val);
function codeUpper(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}
function isAmbassadorCoupon(code, kind) {
  const c = codeUpper(code);
  const k = String(kind || "");
  return k === "ref_ambassador_200" || c.startsWith("UFAMB-");
}
function isFriendCoupon(code, kind) {
  const c = codeUpper(code);
  const k = String(kind || "");
  return k === "ref_friend_50" || c.startsWith("UFFRD-");
}
function pickCouponCreatedAt(c) {
  const raw =
    c?.coupon?.date_created ||
    c?.coupon?.date_created_gmt ||
    c?.coupon?.date_modified ||
    c?.coupon?.date_modified_gmt ||
    "";
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function parseMetaDataForPayment(metaData) {
  const info = {};
  if (!Array.isArray(metaData)) return info;
  metaData.forEach((item) => {
    const key = String(item.key || "").toLowerCase();
    const val = Array.isArray(item.value)
      ? String(item.value[0])
      : String(item.value || "");
    if (
      key.includes("vaccount") ||
      key.includes("virtual_account") ||
      key.includes("atm_account")
    )
      info.atm_account = val;
    if (
      key.includes("bankcode") ||
      key.includes("bank_code") ||
      key.includes("atm_bank")
    )
      info.bank_code = val;
    if (
      key.includes("paymentno") ||
      key.includes("cvs_payment") ||
      key.includes("cvscode")
    )
      info.cvs_code = val;
    if (
      key.includes("expiredate") ||
      key.includes("expire_date") ||
      key.includes("duedate")
    )
      info.expire_date = val;

    if (key.includes("barcode1")) info.barcode1 = val;
    if (key.includes("barcode2")) info.barcode2 = val;
    if (key.includes("barcode3")) info.barcode3 = val;
  });
  return info;
}

function extractInfoFromNote(note) {
  if (!note) return null;
  const result = {};
  const bankMatch = note.match(/銀行代碼.*?(\d{3})/);
  if (bankMatch) result.bank_code = bankMatch[1];
  const atmMatch = note.match(/虛擬帳號.*?(\d{12,16})/);
  if (atmMatch) result.atm_account = atmMatch[1];
  const cvsMatch = note.match(/繳費代碼.*?([a-zA-Z0-9]{14})/);
  if (cvsMatch) result.cvs_code = cvsMatch[1];

  const expMatch = note.match(
    /期限.*?(\d{4}[-/]\d{2}[-/]\d{2}(?: \d{2}:\d{2}:\d{2})?)/,
  );
  if (expMatch) result.expire_date = expMatch[1];

  return Object.keys(result).length > 0 ? result : null;
}

// ============================================================================
// UI Atoms
// ============================================================================
function StatusPill({ status, type = "order" }) {
  const s = String(status || "").toLowerCase();
  if (type === "order") {
    let label = status;
    let tone = "bg-[#e4e5e7] text-[#202223] border-transparent";
    let dotColor = "fill-[#5c5f62]";
    if (s === "pending" || s === "待付款" || s === "waiting-payment") {
      label = "待付款";
      tone = "bg-[#ffea8a] text-[#8a6116] border-transparent";
      dotColor = "fill-[#8a6116]";
    } else if (s === "processing" || s === "處理中") {
      label = "處理中";
      tone = "bg-[#ffea8a] text-[#8a6116] border-transparent";
      dotColor = "fill-[#8a6116]";
    } else if (
      s === "completed" ||
      s === "paid" ||
      s === "已完成" ||
      s === "已出貨" ||
      s === "已到貨"
    ) {
      label = s === "已到貨" ? "已到貨" : "已出貨";
      tone = "bg-[#cbe5cc] text-[#1c5c27] border-transparent";
      dotColor = "fill-[#1c5c27]";
    } else if (s === "逾期未取") {
      label = "逾期未取";
      tone = "bg-[#ffd6d6] text-[#8a1f1f] border-transparent";
      dotColor = "fill-[#8a1f1f]";
    } else if (s === "cancelled" || s === "已取消") {
      label = "已取消";
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
          tone,
        )}
      >
        <Circle className={cn("w-1.5 h-1.5 shrink-0", dotColor)} />
        {label}
      </span>
    );
  }
  if (type === "account") {
    const isActive = s === "active" || s === "有效" || s === "正常";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm whitespace-nowrap",
          isActive
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-gray-100 text-gray-600 border-gray-200",
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400",
          )}
        />
        {isActive ? "正常" : status}
      </span>
    );
  }
  const isGold = s.includes("金") || s.includes("gold");
  const isSilver = s.includes("銀") || s.includes("silver");
  const isAdmin = s.includes("管理") || s.includes("admin");
  let theme = "bg-slate-100 text-slate-600 border-slate-200";
  let Icon = Zap;
  if (isGold) {
    theme = "bg-amber-50 text-amber-700 border-amber-200 shadow-sm";
    Icon = Crown;
  } else if (isSilver) {
    theme = "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm";
    Icon = Crown;
  } else if (isAdmin) {
    theme = "bg-[#1a1a1a] text-white border-black shadow-sm";
    Icon = ShieldCheck;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider whitespace-nowrap",
        theme,
      )}
    >
      <Icon size={12} className={cn("shrink-0", !isAdmin && "text-current")} />
      {status}
    </span>
  );
}

function ShellCard({ title, right, children, className }) {
  return (
    <section
      className={cn(
        "bg-white border border-[#c9cccf] rounded-lg shadow-sm overflow-hidden",
        className,
      )}
    >
      {(title || right) && (
        <header className="px-4 sm:px-5 py-4 border-b border-[#c9cccf] flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[#202223] sm:text-[18px]">
            {title}
          </h2>
          <div>{right}</div>
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function MiniField({ label, value }) {
  return (
    <div className="w-full min-w-0">
      <p className="text-xs text-[#6d7175] mb-1">{label}</p>
      <div className="text-sm text-[#202223] font-medium break-all">
        {value}
      </div>
    </div>
  );
}

function SidebarItem({ active, label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 w-full text-left rounded-md transition-colors text-sm",
        active
          ? "bg-[#f6f6f7] text-[#202223] font-semibold shadow-sm"
          : "text-[#5c5f62] hover:bg-[#f1f2f4]",
      )}
    >
      <span className={active ? "text-[#202223]" : "text-[#8c9196]"}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function MetricBlock({ title, value, subtext }) {
  return (
    <div className="flex flex-col w-full">
      <span className="text-xs font-medium text-[#6d7175] mb-1">{title}</span>
      <div className="text-xl font-bold text-[#202223] flex flex-wrap items-center gap-x-2 gap-y-1">
        {value}
        {subtext && (
          <span className="text-xs font-normal text-[#6d7175] break-words w-full sm:w-auto">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

function getTierDisplay(tierName, membership) {
  if (membership?.tierLabel) return membership.tierLabel;
  const map = {
    HOVER_FRIENDS: "品牌好友",
    HOVER_EXCLUSIVE: "臻享會員",
  };
  return map[tierName] || tierName || "品牌好友";
}

function HoverUnderlineField({
  label,
  value,
  type = "text",
  onChange,
  readOnly = false,
}) {
  return (
    <div className="pb-5 sm:pb-4">
      <input
        type={type}
        readOnly={readOnly}
        value={value || ""}
        onChange={onChange}
        placeholder={label}
        className={cn(
          "w-full border-0 border-b border-[#bbb] bg-transparent pb-2.5 pt-1.5 text-[16px] text-black placeholder-[#aaa] outline-none focus:border-[#2a514d] sm:pb-2 sm:pt-1",
          readOnly && "cursor-default opacity-70",
        )}
      />
    </div>
  );
}

function HoverSectionAction({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-6 inline-block bg-[#2a514d] px-6 py-2.5 text-[15px] font-medium tracking-wide text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function isLikelyMobileDevice() {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const narrow = window.matchMedia?.("(max-width: 768px)")?.matches;
  const ua = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  return Boolean(coarse || narrow || ua);
}

function ReturnLineModal({ order, open, onClose }) {
  const lineUrl = buildReturnLineUrl(order);
  const bridgeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${buildReturnLineBridgePath(order)}`
      : buildReturnLineBridgePath(order);
  const qrUrl = buildReturnLineQrImageUrl(bridgeUrl, 280);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative z-[10000] w-full max-w-[380px] bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="申請退貨 LINE"
      >
        <h3 className="text-[17px] font-semibold text-black">申請退貨</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#666]">
          請用手機打開 LINE／相機掃描下方 QR Code，將自動帶入退貨訂單資訊。
        </p>

        <div className="mx-auto mt-5 flex h-[280px] w-[280px] items-center justify-center rounded border border-[#eee] bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="申請退貨 LINE QR Code"
            width={280}
            height={280}
            className="h-[260px] w-[260px]"
          />
        </div>

        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex h-11 w-full items-center justify-center bg-[#2a514d] px-4 text-[13px] text-white transition-opacity hover:opacity-90"
        >
          已安裝 LINE？直接開啟
        </a>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-[13px] text-[#888] underline underline-offset-2"
        >
          關閉
        </button>
      </div>
    </div>
  );
}

function OrderActionButton({
  order,
  onCancel,
  cancelling = false,
  className = "",
  fullWidth = false,
}) {
  const [returnOpen, setReturnOpen] = useState(false);
  const kind = resolveOrderAction(order);
  const label = getOrderActionLabel(kind, order);
  const variant = getOrderActionVariant(kind);
  const base = cn(
    "inline-flex h-10 items-center justify-center px-5 text-[13px] tracking-wide transition-opacity",
    fullWidth ? "w-full" : "shrink-0",
    variant === "primary"
      ? "bg-[#2a514d] text-white hover:opacity-90"
      : "border border-[#2a514d] bg-white text-[#2a514d] hover:bg-[#f4f8f7]",
    className,
  );

  if (kind === "cancel") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel?.(order);
        }}
        disabled={cancelling}
        className={cn(base, "disabled:cursor-not-allowed disabled:opacity-50")}
      >
        {cancelling ? "取消中…" : label}
      </button>
    );
  }

  if (kind === "return") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isLikelyMobileDevice()) {
              window.open(buildReturnLineUrl(order), "_blank", "noopener,noreferrer");
              return;
            }
            setReturnOpen(true);
          }}
          className={base}
        >
          {label}
        </button>
        <ReturnLineModal
          order={order}
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
        />
      </>
    );
  }

  return (
    <a
      href={getOrderActionHref(order, kind)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={base}
    >
      {label}
    </a>
  );
}

function OrderStatusBadge({ label }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#d8ebe4] px-3 py-1 text-[12px] font-medium text-[#2a514d]">
      {label}
    </span>
  );
}

function PaymentStatusBadge({ label }) {
  const unpaid = label === "待付款" || label === "未付款";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium",
        unpaid
          ? "bg-[#ffea8a] text-[#8a6116]"
          : "bg-[#d7e8f5] text-[#2a5a7a]",
      )}
    >
      {label}
    </span>
  );
}

function getOrderPaymentInfo(order) {
  const fromApi =
    order?.payment_info && typeof order.payment_info === "object"
      ? order.payment_info
      : {};
  const fromMeta = parseMetaDataForPayment(order?.meta_data);
  const fromNote = extractInfoFromNote(order?.customer_note) || {};
  return {
    bank_code: fromApi.bank_code || fromMeta.bank_code || fromNote.bank_code || "",
    atm_account:
      fromApi.atm_account || fromMeta.atm_account || fromNote.atm_account || "",
    expire_date:
      fromApi.expire_date || fromMeta.expire_date || fromNote.expire_date || "",
    cvs_code: fromApi.cvs_code || fromMeta.cvs_code || fromNote.cvs_code || "",
  };
}

function isAtmPaymentOrder(order) {
  const method = String(order?.payment_method || "").toLowerCase();
  const title = String(order?.payment_method_title || "").toLowerCase();
  return (
    method.includes("atm") ||
    title.includes("atm") ||
    title.includes("虛擬帳號") ||
    title.includes("轉帳")
  );
}

function OrderDetail({
  order,
  onBack,
  onRefreshPayment,
  onCancelOrder,
  cancelling = false,
  refreshing = false,
}) {
  const shippingSettings = useShippingSettings();
  const shipping = order.shipping || {};
  const billing = order.billing || {};
  const recipient =
    `${shipping.last_name || ""}${shipping.first_name || ""}`.trim() ||
    `${billing.last_name || ""}${billing.first_name || ""}`.trim() ||
    "—";
  const phone = shipping.phone || billing.phone || "—";
  const storeId = getMetaValue(order.meta_data, [
    "_shipping_cvs_store_ID",
    "_shipping_cvs_store_id",
    "shipping_cvs_store_ID",
  ]);
  const storeName = getMetaValue(order.meta_data, [
    "_shipping_cvs_store_name",
    "shipping_cvs_store_name",
  ]);
  const storeAddress = getMetaValue(order.meta_data, [
    "_shipping_cvs_store_address",
    "shipping_cvs_store_address",
  ]);
  const addressParts = [
    shipping.state || billing.state,
    shipping.city || billing.city,
    shipping.address_1 || billing.address_1,
    shipping.address_2 || billing.address_2,
  ].filter(Boolean);
  const homeAddress = addressParts.join("") || "—";
  const shippingMethod = formatShippingMethodLabel(
    order.shipping_lines?.[0]?.method_title,
    order.shipping_lines?.[0]?.method_id,
  );
  const isCvs =
    Boolean(storeId || storeName) ||
    /超商|cvs|全家|7-?11|萊爾富|ok/i.test(shippingMethod);
  const shippingTotal = Number(order.shipping_total || 0);
  const discountTotal = Number(order.discount_total || 0);
  const itemsSubtotal = (order.line_items || []).reduce(
    (sum, item) => sum + Number(item.subtotal || item.total || 0),
    0,
  );

  // 結帳折扣多半寫在 fee_lines（折扣碼 HOVER100…），不是 discount_total
  const feeLines = Array.isArray(order.fee_lines) ? order.fee_lines : [];
  const discountRows = [];
  for (const fee of feeLines) {
    const amount = Number(fee?.total || 0);
    if (!(amount < 0)) continue;
    const name = String(fee?.name || "折扣").trim();
    const codeMatch = name.match(/折扣碼\s+(.+)$/i);
    const label = codeMatch
      ? `折扣（${codeMatch[1].trim()}）`
      : name.startsWith("折扣")
        ? name
        : `折扣（${name}）`;
    discountRows.push({ label, amount: Math.abs(amount) });
  }
  if (discountTotal > 0) {
    const codes = (order.coupon_lines || [])
      .map((c) => String(c?.code || "").trim())
      .filter(Boolean);
    discountRows.push({
      label: codes.length ? `折扣（${codes.join("、")}）` : "折扣",
      amount: discountTotal,
    });
  }
  // 免運優惠：運費為 0 時顯示節省的運費（與設計稿一致）
  const waivedShipping =
    shippingTotal === 0
      ? Number(shippingSettings.homeDeliveryFee || shippingSettings.cvsFee || 85)
      : 0;
  if (waivedShipping > 0) {
    discountRows.push({
      label: "折扣（滿 NT.2,000 免運）",
      amount: waivedShipping,
    });
  }
  const orderStatusLabel = getOrderStatusLabel(order);
  const paymentStatusLabel = getPaymentStatusLabel(order);
  const paymentTitle = order.payment_method_title || "—";
  const isUnpaid =
    paymentStatusLabel === "待付款" || paymentStatusLabel === "未付款";
  const paidAt = isUnpaid
    ? "—"
    : formatOrderDate(order.date_paid || order.date_created, true);
  const invoicePref = invoicePreferenceFromOrderMeta(order.meta_data);
  const invoiceTypeLabel = getInvoiceTypeLabel(invoicePref.type);
  const invoiceTypeDetail = getInvoiceTypeDetail(invoicePref);
  // 發票於付款完成後才向綠界開立；未付款不顯示開立日期
  const invoiceDate = isUnpaid || !order.date_paid
    ? "—"
    : formatOrderDate(order.date_paid, false).replace(
        /(\d+)\/(\d+)\/(\d+)/,
        (_, y, m, d) =>
          `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`,
      );

  const payInfo = getOrderPaymentInfo(order);
  const isAtm = isAtmPaymentOrder(order);
  const showAtmRemittance = isAtm && Boolean(payInfo.atm_account);
  const showAtmPendingHint = isAtm && isUnpaid;

  const InfoRow = ({ label, children, className = "", valueClassName = "" }) => (
    <div className={cn("flex items-start justify-between gap-4 py-2.5", className)}>
      <span className="w-[100px] shrink-0 text-[13px] text-[#8a8a8a]">{label}</span>
      <div
        className={cn(
          "min-w-0 flex-1 text-right text-[13px] leading-relaxed text-[#222]",
          valueClassName,
        )}
      >
        {children}
      </div>
    </div>
  );

  const PaymentStatusWithUpdate = () => (
    <div className="inline-flex flex-wrap items-center justify-end gap-2">
      <PaymentStatusBadge label={paymentStatusLabel} />
      {showAtmPendingHint && typeof onRefreshPayment === "function" ? (
        <button
          type="button"
          onClick={onRefreshPayment}
          disabled={refreshing}
          className="text-[12px] text-[#2a514d] underline underline-offset-2 disabled:opacity-50"
        >
          {refreshing ? "更新中…" : "更新"}
        </button>
      ) : null}
    </div>
  );

  const AtmRemittanceBlock = ({ compact = false, side = false }) => {
    if (!showAtmRemittance && !showAtmPendingHint) return null;
    const tip = isUnpaid
      ? "請於繳費期限內完成付款，逾期訂單將自動取消。"
      : "付款已完成，我們將依訂單順序安排出貨。";

    return (
      <div
        className={cn(
          compact && "mt-3 border-t border-[#f0f0f0] pt-3",
          side && "",
          !compact && !side && "mt-4 border-t border-[#eee] pt-4",
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-black">匯款資訊</p>
          {showAtmPendingHint && typeof onRefreshPayment === "function" ? (
            <button
              type="button"
              onClick={onRefreshPayment}
              disabled={refreshing}
              className="shrink-0 bg-[#2a514d] px-3 py-1.5 text-[12px] text-white transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {refreshing ? "更新中…" : "更新付款狀態"}
            </button>
          ) : null}
        </div>
        {showAtmRemittance ? (
          <div className="divide-y divide-[#f0f0f0]">
            <InfoRow label="應付金額">
              <span className="font-medium">{formatMoneyDot(order.total)}</span>
            </InfoRow>
            <InfoRow label="銀行">
              {formatAtmBankLabel(payInfo.bank_code)}
            </InfoRow>
            <InfoRow label="虛擬帳號">
              <span className="tracking-wide">{payInfo.atm_account}</span>
            </InfoRow>
            {payInfo.expire_date ? (
              <InfoRow label="繳費期限">{payInfo.expire_date}</InfoRow>
            ) : null}
            <p className="pt-3 text-[12px] leading-relaxed text-[#2a514d]">
              {tip}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-[#888]">
            虛擬帳號資料讀取中，請稍後再點更新。
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full text-[#222]">
      {/* Header */}
      <div className="relative mb-5 flex items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-0 inline-flex items-center gap-0.5 text-[13px] text-[#666] transition-opacity hover:opacity-70"
          aria-label="返回訂單列表"
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
          <span className="hidden sm:inline">返回</span>
        </button>
        <h2 className="text-[20px] font-semibold tracking-wide text-black">
          我的訂單
        </h2>
      </div>

      {/* ── Mobile summary card (圖一) ── */}
      <section className="mb-4 overflow-hidden rounded-lg border border-[#e4e4e4] bg-white md:hidden">
        <div className="space-y-0 px-4 py-2">
          <InfoRow label="訂單編號">
            <span className="font-semibold text-[#2a514d]">
              {order.number || order.id}
            </span>
          </InfoRow>
          <InfoRow label="訂單日期">
            {formatOrderDate(order.date_created, true)}
          </InfoRow>
          <InfoRow label="訂單狀態">
            <OrderStatusBadge label={orderStatusLabel} />
          </InfoRow>
          <InfoRow label="付款狀態">
            <PaymentStatusWithUpdate />
          </InfoRow>
          <InfoRow label="總金額">
            <span className="font-medium">{formatMoneyDot(order.total)}</span>
          </InfoRow>
        </div>
        <div className="px-4 pb-4 pt-2">
          <OrderActionButton
            order={order}
            onCancel={onCancelOrder}
            cancelling={cancelling}
            fullWidth
            className="h-11 rounded-md text-[14px]"
          />
        </div>
      </section>

      {/* ── Desktop summary ── */}
      <section className="mb-8 hidden border border-[#d9d9d9] bg-white px-6 py-5 md:block">
        <div className="flex items-center justify-between gap-6">
          <div className="grid flex-1 grid-cols-5 gap-6">
            <div>
              <p className="mb-1 text-[12px] text-[#888]">訂單編號</p>
              <p className="text-[15px] font-semibold text-[#2a514d]">
                {order.number || order.id}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[12px] text-[#888]">訂單日期</p>
              <p className="text-[14px]">
                {formatOrderDate(order.date_created, true)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[12px] text-[#888]">訂單狀態</p>
              <OrderStatusBadge label={orderStatusLabel} />
            </div>
            <div>
              <p className="mb-1 text-[12px] text-[#888]">付款狀態</p>
              <PaymentStatusWithUpdate />
            </div>
            <div>
              <p className="mb-1 text-[12px] text-[#888]">總金額</p>
              <p className="text-[15px] font-semibold">
                {formatMoneyDot(order.total)}
              </p>
            </div>
          </div>
          <OrderActionButton
            order={order}
            onCancel={onCancelOrder}
            cancelling={cancelling}
            className="h-11 px-6"
          />
        </div>
      </section>

      {/* ── Mobile product card (圖一) ── */}
      <section className="mb-4 overflow-hidden rounded-lg border border-[#e4e4e4] bg-white md:hidden">
        <div className="px-4 pb-4 pt-4">
          <h3 className="mb-4 text-[15px] font-semibold text-black">商品資訊</h3>
          <div className="space-y-4">
            {(order.line_items || []).map((item, index) => {
              const variant = getItemVariantText(item);
              const displayName = getItemDisplayName(item);
              return (
                <div
                  key={`${order.id}-m-${index}`}
                  className="flex gap-3"
                >
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden bg-[#f5f5f3]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={displayName}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-[#aaa]">
                        HOVER
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[14px] font-medium leading-snug text-black">
                          {displayName}
                        </p>
                        <p className="shrink-0 text-[14px] font-medium text-black">
                          {formatMoneyDot(item.total)}
                        </p>
                      </div>
                      {variant ? (
                        <p className="mt-1 text-[12px] text-[#888]">
                          {variant.replace(/\s*\/\s*/g, " / ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-2.5 border-t border-[#eee] pt-4 text-[13px]">
            <div className="flex justify-between gap-4">
              <span className="text-[#8a8a8a]">商品小計</span>
              <span>{formatMoneyDot(itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#8a8a8a]">運費</span>
              <span>{formatMoneyDot(shippingTotal)}</span>
            </div>
            {discountRows.length > 0 ? (
              discountRows.map((row, i) => (
                <div
                  key={`m-disc-${i}`}
                  className="flex justify-between gap-4"
                >
                  <span className="text-[#8a8a8a]">{row.label}</span>
                  <span className="text-[#2a514d]">
                    -{formatMoneyDot(row.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between gap-4">
                <span className="text-[#8a8a8a]">折扣</span>
                <span>{formatMoneyDot(0)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-[#eee] pt-3">
              <span className="font-semibold text-black">訂單總額</span>
              <span className="text-[16px] font-semibold text-black">
                {formatMoneyDot(order.total)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Desktop products ── */}
      <section className="mb-8 hidden md:block">
        <h3 className="mb-4 text-[15px] font-semibold text-black">商品資訊</h3>
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_72px_110px_110px] border-b border-[#ddd] pb-2 text-[12px] text-[#888]">
          <span>商品</span>
          <span className="text-center">數量</span>
          <span className="text-right">單價</span>
          <span className="text-right">小計</span>
        </div>
        <div className="space-y-5">
          {(order.line_items || []).map((item, index) => {
            const variant = getItemVariantText(item);
            const displayName = getItemDisplayName(item);
            const unit =
              Number(item.price || 0) ||
              (Number(item.quantity) > 0
                ? Number(item.subtotal || item.total || 0) /
                  Number(item.quantity)
                : 0);
            return (
              <div
                key={`${order.id}-d-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_72px_110px_110px] items-center gap-4 border-b border-[#eee] pb-5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative h-[84px] w-[72px] shrink-0 overflow-hidden bg-[#f7f7f5]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={displayName}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-[#aaa]">
                        HOVER
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-black">
                      {displayName}
                    </p>
                    {variant ? (
                      <p className="mt-1 text-[12px] text-[#777]">
                        {variant.replace(/\s*\/\s*/g, " / ")}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="text-center text-[14px]">{item.quantity}</p>
                <p className="text-right text-[14px]">{formatMoneyDot(unit)}</p>
                <p className="text-right text-[14px] font-medium">
                  {formatMoneyDot(item.total)}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-[280px] space-y-2 text-[13px]">
            <div className="flex justify-between gap-6">
              <span className="text-[#777]">商品小計</span>
              <span>{formatMoneyDot(itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-[#777]">運費</span>
              <span>{formatMoneyDot(shippingTotal)}</span>
            </div>
            {discountRows.length > 0 ? (
              discountRows.map((row, i) => (
                <div
                  key={`d-disc-${i}`}
                  className="flex justify-between gap-6"
                >
                  <span className="text-[#777]">{row.label}</span>
                  <span className="text-[#2a514d]">
                    -{formatMoneyDot(row.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between gap-6">
                <span className="text-[#777]">折扣</span>
                <span>{formatMoneyDot(0)}</span>
              </div>
            )}
            <div className="flex justify-between gap-6 border-t border-[#ddd] pt-3 text-[16px] font-semibold">
              <span>訂單總額</span>
              <span className="text-[#2a514d]">
                {formatMoneyDot(order.total)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mobile shipping card (圖一) ── */}
      <section className="mb-4 overflow-hidden rounded-lg border border-[#e4e4e4] bg-white md:hidden">
        <div className="px-4 py-4">
          <h3 className="mb-3 text-[15px] font-semibold text-black">
            收件 / 配送資訊
          </h3>
          <div className="divide-y divide-[#f0f0f0]">
            <InfoRow label="收件人">{recipient}</InfoRow>
            <InfoRow label="手機號碼">{phone}</InfoRow>
            {isCvs ? (
              <>
                <InfoRow label="取件門市">
                  <span className="break-words">
                    {storeName || "—"}
                    {storeId ? `（${storeId}）` : ""}
                  </span>
                </InfoRow>
                <InfoRow label="取件地址" valueClassName="text-left">
                  {storeAddress || homeAddress}
                </InfoRow>
              </>
            ) : (
              <InfoRow label="收件地址" valueClassName="text-left">
                {homeAddress}
              </InfoRow>
            )}
          </div>
          <div className="mt-1 divide-y divide-[#f0f0f0] border-t border-[#eee] pt-1">
            <InfoRow label="配送方式">{shippingMethod}</InfoRow>
            <InfoRow label="發票類型">
              <span>{invoiceTypeLabel}</span>
              {invoiceTypeDetail ? (
                <span className="mt-0.5 block text-[12px] text-[#888]">
                  {invoiceTypeDetail}
                </span>
              ) : null}
            </InfoRow>
            <InfoRow label="發票開立日期">{invoiceDate}</InfoRow>
          </div>
        </div>
      </section>

      {/* ── Desktop shipping ── */}
      <section className="mb-8 hidden border border-[#d9d9d9] bg-white px-6 py-5 md:block">
        <h3 className="mb-4 text-[15px] font-semibold text-black">
          收件 / 配送資訊
        </h3>
        <div className="grid grid-cols-2 gap-x-10 gap-y-0 text-[13px]">
          <div className="divide-y divide-[#f0f0f0]">
            <InfoRow label="收件人">{recipient}</InfoRow>
            <InfoRow label="手機號碼">{phone}</InfoRow>
            {isCvs ? (
              <>
                <InfoRow label="取件門市">
                  <span className="break-words">
                    {storeName || "—"}
                    {storeId ? `（${storeId}）` : ""}
                  </span>
                </InfoRow>
                <InfoRow label="取件地址" valueClassName="text-left sm:text-right">
                  {storeAddress || homeAddress}
                </InfoRow>
              </>
            ) : (
              <InfoRow label="收件地址" valueClassName="text-left sm:text-right">
                {homeAddress}
              </InfoRow>
            )}
          </div>
          <div className="divide-y divide-[#f0f0f0]">
            <InfoRow label="配送方式">{shippingMethod}</InfoRow>
            <InfoRow label="發票類型">
              <span>{invoiceTypeLabel}</span>
              {invoiceTypeDetail ? (
                <span className="mt-0.5 block text-[12px] text-[#888]">
                  {invoiceTypeDetail}
                </span>
              ) : null}
            </InfoRow>
            <InfoRow label="發票開立日期">{invoiceDate}</InfoRow>
          </div>
        </div>
      </section>

      {/* ── Mobile payment card ── */}
      <section className="mb-2 overflow-hidden rounded-lg border border-[#e4e4e4] bg-white md:hidden">
        <div className="px-4 py-4">
          <h3 className="mb-3 text-[15px] font-semibold text-black">付款資訊</h3>
          <div className="divide-y divide-[#f0f0f0]">
            <InfoRow label="付款方式">{paymentTitle}</InfoRow>
            <InfoRow label="付款時間">{paidAt}</InfoRow>
          </div>
          <AtmRemittanceBlock compact />
        </div>
      </section>

      {/* ── Desktop payment ── */}
      <section className="hidden border border-[#d9d9d9] bg-white px-6 py-5 md:block">
        <h3 className="mb-4 text-[15px] font-semibold text-black">付款資訊</h3>
        <div
          className={cn(
            "text-[13px]",
            showAtmRemittance || showAtmPendingHint
              ? "grid grid-cols-2 gap-x-10"
              : "",
          )}
        >
          <div className="divide-y divide-[#f0f0f0]">
            <InfoRow label="付款方式">{paymentTitle}</InfoRow>
            <InfoRow label="付款時間">{paidAt}</InfoRow>
          </div>
          {(showAtmRemittance || showAtmPendingHint) && (
            <AtmRemittanceBlock side />
          )}
        </div>
      </section>
    </div>
  );
}

function AccountTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-1 pb-3 text-[15px] transition-colors whitespace-nowrap sm:text-[16px]",
        active
          ? "font-semibold text-black"
          : "font-normal text-[#888] hover:text-black",
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
      )}
    </button>
  );
}

// ============================================================================
// 主頁面 AccountPage
// ============================================================================


function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");

  const wishlistItems = useWishlistStore((state) => state.items);
  const removeFromWishlist = useWishlistStore((state) => state.removeItem);

  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [membership, setMembership] = useState(null);
  const [error, setError] = useState("");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersDebug, setOrdersDebug] = useState(null);

  const [referral, setReferral] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [couponFilter, setCouponFilter] = useState("usable"); // usable | used | expired
  const [copiedCouponCode, setCopiedCouponCode] = useState(null);
  const [claimLoading, setClaimLoading] = useState({
    welcome: false,
    birthday: false,
  });
  const [claimed, setClaimed] = useState({ welcome: false, birthday: false });
  const [claimMessage, setClaimMessage] = useState(null);
  const [claimStatus, setClaimStatus] = useState(null);
  const [claimedCode, setClaimedCode] = useState(null);
  const [showAllReferralCoupons, setShowAllReferralCoupons] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderRefreshing, setOrderRefreshing] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const [birthdayInput, setBirthdayInput] = useState("");
  const [isSettingBirthday, setIsSettingBirthday] = useState(false);
  const [birthdayLoading, setBirthdayLoading] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState("");
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [modalBirthdayInput, setModalBirthdayInput] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [passwordEditing, setPasswordEditing] = useState(false);
  const [authProvider, setAuthProvider] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/profile", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (data?.loggedIn) {
        const nextCustomer = data.customer || {};
        setLoggedIn(true);
        setCustomer(nextCustomer);
        setAuthProvider(data.authProvider || null);
        setProfileForm({
          name:
            String(nextCustomer.display_name || "").trim() ||
            `${nextCustomer.first_name || ""} ${nextCustomer.last_name || ""}`.trim(),
          phone: nextCustomer.phone || nextCustomer.billing_phone || "",
          address: nextCustomer.billing_address || nextCustomer.address || "",
        });
        setMembership(data.membership || null);
      } else {
        setLoggedIn(false);
        setCustomer(null);
        setMembership(null);
        setAuthProvider(null);
      }
    } catch {
      setError("讀取會員資料失敗，請稍後再試。");
      setLoggedIn(false);
      setAuthProvider(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/account/orders", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      const remote = Array.isArray(data?.orders) ? data.orders : [];
      setOrders(remote);
      setOrdersDebug(data?.debug || null);
    } catch {
      setOrders([]);
      setOrdersDebug({ error: true });
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const refreshOrderPayment = useCallback(async (orderId) => {
    if (!orderId) return;
    setOrderRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 單筆失敗時退回整表刷新
        await loadOrders();
        return;
      }
      setOrders((prev) =>
        prev.map((o) => {
          if (String(o.id) !== String(orderId)) return o;
          return {
            ...o,
            status: data.status || o.status,
            date_paid: data.date_paid || data.date_completed || o.date_paid,
            date_completed: data.date_completed || o.date_completed,
            total: data.total ?? o.total,
            payment_method_title:
              data.payment_method_title || o.payment_method_title,
            payment_method: data.payment_method || o.payment_method,
            customer_note: data.customer_note || o.customer_note,
            payment_info: data.payment_info || o.payment_info,
            meta_data: Array.isArray(data.meta_data) ? data.meta_data : o.meta_data,
          };
        }),
      );
    } catch {
      await loadOrders();
    } finally {
      setOrderRefreshing(false);
    }
  }, [loadOrders]);

  const cancelOrder = useCallback(
    async (order) => {
      const id = order?.id;
      if (!id) return;
      const ok = window.confirm(
        `確定要取消訂單 ${order.number || id}？取消後將無法復原。`,
      );
      if (!ok) return;
      setCancellingOrderId(id);
      try {
        const res = await fetch(`/api/account/orders/${id}/cancel`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          window.alert(data?.message || "取消失敗，請稍後再試或聯繫客服。");
          return;
        }
        await loadOrders();
      } catch {
        window.alert("取消失敗，請稍後再試。");
      } finally {
        setCancellingOrderId(null);
      }
    },
    [loadOrders],
  );

  const loadReferral = useCallback(async () => {
    setReferralLoading(true);
    try {
      const res = await fetch("/api/account/referral", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data?.ok) setReferral(data);
      else setReferral(null);
    } catch {
      setReferral(null);
    } finally {
      setReferralLoading(false);
    }
  }, []);

  const loadAvailableCoupons = useCallback(async () => {
    setAvailableLoading(true);
    try {
      const res = await fetch("/api/account/coupons/available", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        const list = Array.isArray(data.coupons)
          ? data.coupons
          : Array.isArray(data.available)
            ? data.available
            : [];
        setAvailableCoupons(list);
      } else {
        setAvailableCoupons([]);
      }
    } catch {
      setAvailableCoupons([]);
    } finally {
      setAvailableLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "admin") {
      router.replace("/account", { scroll: false });
      setActiveTab("profile");
      return;
    }
    if (tab && ["profile", "orders", "coupons", "favorites"].includes(tab)) {
      setActiveTab(tab);
      return;
    }
    if (!tab) {
      setActiveTab("profile");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (loggedIn) {
      loadOrders();
      loadReferral();
      loadAvailableCoupons();
    }
  }, [loggedIn, loadOrders, loadReferral, loadAvailableCoupons]);

  useEffect(() => {
    if (!availableCoupons.length) return;
    setClaimed((prev) => ({
      welcome:
        prev.welcome ||
        availableCoupons.some((c) => c.kind === "welcome" || c.kind === "legacy"),
      birthday: prev.birthday || availableCoupons.some((c) => c.kind === "birthday"),
    }));
  }, [availableCoupons]);

  useEffect(() => {
    if (!loading && loggedIn && customer && !customer.birthday) {
      const hasPrompted = sessionStorage.getItem("birthdayPrompted");
      if (!hasPrompted) {
        setShowBirthdayModal(true);
        sessionStorage.setItem("birthdayPrompted", "true");
      }
    }
  }, [loading, loggedIn, customer]);

  const handleUpdateBirthday = async () => {
    const value = String(birthdayInput || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setBirthdayMessage("請先選擇生日日期");
      return;
    }
    setBirthdayMessage("");
    setBirthdayLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ birthday: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setBirthdayMessage(data?.message || "更新失敗，請稍後再試");
        return;
      }
      setCustomer((prev) => (prev ? { ...prev, birthday: value } : null));
      setIsSettingBirthday(false);
      setBirthdayInput("");
      setBirthdayMessage("");
      setShowBirthdayModal(false);
      loadProfile();
    } catch {
      setBirthdayMessage("系統錯誤，請稍後再試");
    } finally {
      setBirthdayLoading(false);
    }
  };

  const handleModalSubmit = async () => {
    if (!modalBirthdayInput) return alert("請選擇生日");
    if (
      !confirm(`您的生日是 ${modalBirthdayInput} 嗎？\n確認後將無法再次修改。`)
    )
      return;
    setBirthdayLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday: modalBirthdayInput }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("生日設定成功！");
        setCustomer((prev) =>
          prev ? { ...prev, birthday: modalBirthdayInput } : null,
        );
        setShowBirthdayModal(false);
        loadProfile();
      } else {
        alert(data.message || "更新失敗");
      }
    } catch (e) {
      alert("系統錯誤，請稍後再試");
    } finally {
      setBirthdayLoading(false);
    }
  };

  const handleProfileAction = async () => {
    if (!profileEditing) {
      setProfileMessage("");
      setProfileEditing(true);
      return;
    }
    await handleProfileSave();
  };

  const handleProfileSave = async () => {
    if (!profileForm.name.trim()) {
      setProfileMessage("錯誤：請輸入姓名");
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profile: profileForm }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setProfileMessage(`錯誤：${data?.message || "會員資料更新失敗"}`);
        return;
      }
      setProfileMessage("會員資料已更新");
      setProfileEditing(false);
      await loadProfile();
    } catch {
      setProfileMessage("錯誤：系統錯誤，請稍後再試");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordAction = async () => {
    if (!passwordEditing) {
      setPasswordMessage("");
      setPasswordEditing(true);
      return;
    }
    await handlePasswordSave();
  };

  const handlePasswordSave = async () => {
    setPasswordMessage("");
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordMessage("錯誤：請完整填寫三個密碼欄位");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage("錯誤：新密碼長度至少 8 碼");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("錯誤：兩次輸入的新密碼不一致");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setPasswordMessage(`錯誤：${data?.message || "密碼修改失敗"}`);
        return;
      }
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage("密碼修改成功");
      setPasswordEditing(false);
    } catch {
      setPasswordMessage("錯誤：系統錯誤，請稍後再試");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleClaim = async (kind) => {
    setClaimMessage(null);
    setClaimStatus(null);
    setClaimedCode(null);
    setClaimLoading((prev) => ({ ...prev, [kind]: true }));
    try {
      const res = await fetch("/api/account/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setClaimStatus("error");
        setClaimMessage(
          data?.message || data?.detail || "領取失敗，請稍後再試。",
        );
        return;
      }
      setClaimStatus("success");
      setClaimMessage(data.message || "領取成功！");
      if (data.coupon?.code) setClaimedCode(data.coupon.code);
      setClaimed((prev) => ({ ...prev, [kind]: true }));
      loadAvailableCoupons();
    } catch {
      setClaimStatus("error");
      setClaimMessage("系統錯誤，請稍後再試。");
    } finally {
      setClaimLoading((prev) => ({ ...prev, [kind]: false }));
    }
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.number.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q) ||
        o.total.includes(q),
    );
  }, [orders, searchQuery]);

  const orderStats = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o) => {
      const s = String(o.status || "").toLowerCase();
      return (
        s === "completed" ||
        s === "processing" ||
        s === "paid" ||
        s === "已完成" ||
        s === "處理中"
      );
    }).length;
    const pending = orders.filter((o) => {
      const s = String(o.status || "").toLowerCase();
      return (
        s === "pending" ||
        s === "on-hold" ||
        s === "待付款" ||
        s === "waiting-payment"
      );
    }).length;
    const totalSpent = orders.reduce(
      (sum, o) => sum + (Number(o.total) || 0),
      0,
    );
    return { total, completed, pending, totalSpent };
  }, [orders]);

  const switchTab = useCallback(
    (tab) => {
      setActiveTab(tab);
      setSearchQuery("");
      setSelectedOrderId(null);
      setCouponFilter("usable");
      setCopiedCouponCode(null);
      const url = tab === "profile" ? "/account" : `/account?tab=${tab}`;
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const sortedCoupons = useMemo(() => {
    const seen = new Set();
    return [...availableCoupons]
      .filter((c) => {
        const code = String(c?.code || "").toUpperCase();
        if (!code || seen.has(code)) return false;
        seen.add(code);
        return true;
      })
      .sort((a, b) => pickCouponCreatedAt(b) - pickCouponCreatedAt(a));
  }, [availableCoupons]);

  const filteredCoupons = useMemo(() => {
    let base = sortedCoupons.filter((c) => {
      const status = c.status || "usable";
      return status === couponFilter;
    });
    if (searchQuery && activeTab === "coupons") {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (c) =>
          String(c.code || "").toLowerCase().includes(q) ||
          String(c.kindLabel || "").toLowerCase().includes(q) ||
          String(c.amount).includes(q),
      );
    }
    return base;
  }, [sortedCoupons, couponFilter, searchQuery, activeTab]);

  const handleCopyCoupon = useCallback((code) => {
    const value = String(code || "").toUpperCase();
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedCouponCode(value);
    window.setTimeout(() => {
      setCopiedCouponCode((prev) => (prev === value ? null : prev));
    }, 1800);
  }, []);

  const ambassadorCoupons = useMemo(
    () => sortedCoupons.filter((c) => isAmbassadorCoupon(c.code, c.kind)),
    [sortedCoupons],
  );
  const friendCoupons = useMemo(
    () => sortedCoupons.filter((c) => isFriendCoupon(c.code, c.kind)),
    [sortedCoupons],
  );
  const ambassadorTotal = useMemo(
    () =>
      ambassadorCoupons.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    [ambassadorCoupons],
  );
  const friendTotal = useMemo(
    () => friendCoupons.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    [friendCoupons],
  );
  const referralTotal = ambassadorTotal + friendTotal;

  const getBirthMonthLabel = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}月`;
  };
  const isCurrentMonthBirthday = useMemo(() => {
    if (!customer?.birthday) return false;
    const d = new Date(customer.birthday);
    const now = new Date();
    return d.getMonth() === now.getMonth();
  }, [customer?.birthday]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-hover-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a514d] border-t-transparent" />
          <p className="text-sm text-[#888]">載入中...</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-hover-bg px-4">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold text-black">尚未登入</h2>
          <p className="mb-8 text-sm text-[#666]">
            請先登入以檢視您的會員中心與專屬優惠。
          </p>
          <button
            onClick={() => {
              const next =
                new URLSearchParams(window.location.search).get("tab") ===
                "favorites"
                  ? "/account?tab=favorites"
                  : "/account";
              router.push(`/login?next=${encodeURIComponent(next)}`);
            }}
            className="w-full bg-[#2a514d] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1e3d3a]"
          >
            前往登入
          </button>
          <p className="mt-4 text-[13px] text-[#888]">
            還不是會員？{" "}
            <Link href="/register" className="text-black underline hover:opacity-60">
              立即註冊
            </Link>
          </p>
          {error && (
            <p className="mt-4 break-words rounded bg-rose-50 p-2 text-xs text-rose-600">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hover-bg pb-16 text-black">
      <div className="mx-auto max-w-[1140px] px-4 py-6 sm:px-6 sm:py-14 lg:px-8">
        {/* Page title */}
        <h1 className="mb-6 text-center text-[26px] font-semibold tracking-wide sm:mb-8 sm:text-[30px]">
          我的會員中心
        </h1>

        {/* Tab bar + logout */}
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#ccc] sm:mb-8 sm:gap-10 md:gap-14">
          <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-8 md:gap-10">
            <AccountTabButton
              active={activeTab === "profile"}
              onClick={() => switchTab("profile")}
            >
              個人資料
            </AccountTabButton>
            <AccountTabButton
              active={activeTab === "orders"}
              onClick={() => switchTab("orders")}
            >
              <span className="md:hidden">訂單</span>
              <span className="hidden md:inline">訂單查詢/申請退貨</span>
            </AccountTabButton>
            <AccountTabButton
              active={activeTab === "coupons"}
              onClick={() => switchTab("coupons")}
            >
              優惠券
            </AccountTabButton>
            <AccountTabButton
              active={activeTab === "favorites"}
              onClick={() => switchTab("favorites")}
            >
              收藏
            </AccountTabButton>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              const { useAuthStore } = await import("@/lib/authStore");
              useAuthStore.getState().resetAuth();
              router.replace("/login?next=/account");
            }}
            className="mb-3 ml-3 flex shrink-0 items-center gap-1.5 text-[15px] text-[#c0392b] transition-opacity hover:opacity-70 sm:ml-6 sm:text-[15px]"
          >
            <LogOut size={16} strokeWidth={1.5} />
            登出
          </button>
        </div>

        <div className="w-full">
            {/* 個人資料 Tab */}
            {activeTab === "profile" && (
              <>
                {/* Summary row */}
                <div className="mb-8 flex flex-col gap-6 border-b border-[#ddd] pb-8 sm:mb-10 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <div className="min-w-0 sm:shrink-0">
                    <div className="mb-3 inline-block border border-[#ccc] bg-white px-4 py-2 text-[15px] font-medium sm:text-[15px]">
                      {getTierDisplay(membership?.tierName, membership)}
                      {membership?.tierLabelEn && (
                        <span className="ml-2 text-[12px] font-normal text-[#888]">
                          {membership.tierLabelEn}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] leading-relaxed text-[#555] sm:whitespace-nowrap sm:text-[14px]">
                      近 12 個月累積消費滿 NT.10,000，即可升級為臻享會員
                    </p>
                    <Link
                      href="/membership"
                      className="mt-2 inline-flex items-center gap-1 text-[13px] text-[#555] underline-offset-2 hover:underline"
                    >
                      了解會員制度 ▶
                    </Link>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-x-4 gap-y-5 sm:w-auto sm:flex-1 sm:grid-cols-4 sm:gap-4 sm:pl-6 md:pl-10 lg:pl-14">
                    <div>
                      <p className="mb-1 text-[12px] text-[#888]">累積消費總額</p>
                      <p className="text-[16px] font-semibold sm:text-[17px]">
                        {formatMoneyNT(orderStats.totalSpent)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[12px] text-[#888]">訂單總數</p>
                      <p className="text-[16px] font-semibold sm:text-[17px]">{orderStats.total}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[12px] text-[#888]">已完成訂單</p>
                      <p className="text-[16px] font-semibold sm:text-[17px]">{orderStats.completed}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[12px] text-[#888]">待付款</p>
                      <p className="text-[16px] font-semibold sm:text-[17px]">{orderStats.pending}</p>
                    </div>
                  </div>
                </div>

                {/* Profile + password columns */}
                <div className="mb-10 grid grid-cols-1 gap-10 md:mb-12 md:grid-cols-2 md:gap-16">
                  <div>
                    <HoverSectionAction
                      onClick={handleProfileAction}
                      disabled={profileSaving}
                    >
                      {profileSaving
                        ? "儲存中..."
                        : profileEditing
                          ? "確認修改"
                          : "會員資料修改"}
                    </HoverSectionAction>
                    <HoverUnderlineField
                      label="姓名"
                      value={profileForm.name}
                      readOnly={!profileEditing}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                    <HoverUnderlineField
                      label="電話"
                      value={profileForm.phone}
                      readOnly={!profileEditing}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                    <HoverUnderlineField
                      label="電子信箱"
                      value={customer?.email || "—"}
                      readOnly
                    />
                    <p className="-mt-3 mb-5 text-[12px] leading-relaxed text-[#888] sm:-mt-2 sm:mb-6">
                      必填，用於接收訂單及優惠券通知
                    </p>
                    {customer?.birthday ? (
                      <HoverUnderlineField
                        label="生日"
                        value={customer.birthday}
                        type="date"
                        readOnly
                      />
                    ) : (
                      <div className="pb-5 sm:pb-4">
                        {!isSettingBirthday ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBirthdayMessage("");
                              setIsSettingBirthday(true);
                            }}
                            className="text-left transition-opacity hover:opacity-70"
                          >
                            <span className="block text-[16px] text-[#2a514d] underline underline-offset-2 sm:text-[15px]">
                              設定生日
                            </span>
                            <span className="mt-1 block text-[12px] text-[#888]">
                              設定完成後將無法修改
                            </span>
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <p className="text-[16px] font-medium text-black sm:text-[15px]">
                                設定生日
                              </p>
                              <p className="mt-1 text-[12px] text-[#888]">
                                設定完成後將無法修改
                              </p>
                            </div>
                            <input
                              type="date"
                              value={birthdayInput}
                              onChange={(e) => {
                                setBirthdayInput(e.target.value);
                                if (birthdayMessage) setBirthdayMessage("");
                              }}
                              max={new Date().toISOString().slice(0, 10)}
                              className="box-border min-h-[44px] w-full border-0 border-b border-[#bbb] bg-transparent px-0 py-2 text-[16px] text-black outline-none focus:border-black"
                            />
                            {birthdayMessage && (
                              <p className="text-[12px] text-red-600">
                                {birthdayMessage}
                              </p>
                            )}
                            <div className="flex items-center gap-4 pt-1">
                              <button
                                type="button"
                                onClick={handleUpdateBirthday}
                                disabled={birthdayLoading}
                                className="min-h-[40px] bg-[#2a514d] px-5 py-2 text-[14px] text-white hover:bg-[#1e3d3a] disabled:opacity-50"
                              >
                                {birthdayLoading ? "儲存中..." : "確認"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSettingBirthday(false);
                                  setBirthdayInput("");
                                  setBirthdayMessage("");
                                }}
                                className="min-h-[40px] text-[14px] text-[#888] hover:text-black"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <HoverUnderlineField
                      label="地址"
                      value={profileForm.address}
                      readOnly={!profileEditing}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                    />
                    {profileMessage && (
                      <p
                        className={`mt-3 text-[12px] ${
                          profileMessage.startsWith("錯誤：")
                            ? "text-red-600"
                            : "text-[#2a514d]"
                        }`}
                      >
                        {profileMessage}
                      </p>
                    )}
                  </div>
                  <div>
                    {authProvider ? (
                      <>
                        <p className="mb-4 text-[15px] font-semibold tracking-wide text-black sm:text-[16px]">
                          登入方式
                        </p>
                        <p className="text-[14px] leading-relaxed text-[#333] sm:text-[15px]">
                          您以{" "}
                          {authProvider === "google"
                            ? "Google"
                            : authProvider === "facebook"
                              ? "Facebook"
                              : authProvider === "line"
                                ? "LINE"
                                : "社群帳號"}{" "}
                          登入，無需設定或修改密碼。
                        </p>
                      </>
                    ) : (
                      <>
                        <HoverSectionAction
                          onClick={handlePasswordAction}
                          disabled={passwordSaving}
                        >
                          {passwordSaving
                            ? "修改中..."
                            : passwordEditing
                              ? "確認修改"
                              : "密碼修改"}
                        </HoverSectionAction>
                        <div className="space-y-0">
                          <div className="pb-4">
                            <PasswordInput
                              placeholder="請輸入舊密碼"
                              autoComplete="current-password"
                              readOnly={!passwordEditing}
                              value={passwordForm.currentPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  currentPassword: e.target.value,
                                }))
                              }
                              inputClassName={cn(
                                "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[16px] text-black placeholder-[#aaa] outline-none focus:border-[#2a514d]",
                                !passwordEditing && "cursor-default opacity-70",
                              )}
                            />
                          </div>
                          <div className="pb-4">
                            <PasswordInput
                              placeholder="新密碼"
                              autoComplete="new-password"
                              readOnly={!passwordEditing}
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  newPassword: e.target.value,
                                }))
                              }
                              inputClassName={cn(
                                "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[16px] text-black placeholder-[#aaa] outline-none focus:border-[#2a514d]",
                                !passwordEditing && "cursor-default opacity-70",
                              )}
                            />
                          </div>
                          <div className="pb-4">
                            <PasswordInput
                              placeholder="請再輸入一次新密碼"
                              autoComplete="new-password"
                              readOnly={!passwordEditing}
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  confirmPassword: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && passwordEditing) {
                                  handlePasswordAction();
                                }
                              }}
                              inputClassName={cn(
                                "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[16px] text-black placeholder-[#aaa] outline-none focus:border-[#2a514d]",
                                !passwordEditing && "cursor-default opacity-70",
                              )}
                            />
                          </div>
                        </div>
                        {passwordMessage && (
                          <p
                            className={`mt-3 text-[12px] ${
                              passwordMessage.startsWith("錯誤：")
                                ? "text-red-600"
                                : "text-[#2a514d]"
                            }`}
                          >
                            {passwordMessage}
                          </p>
                        )}
                        <Link
                          href="/forgot-password"
                          className="mt-4 inline-block text-[15px] text-[#2a514d] underline underline-offset-2 hover:opacity-70"
                        >
                          忘記密碼？前往重設
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 優惠券 Tab */}
            {activeTab === "coupons" && (
              <div className="w-full">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h2 className="text-[18px] font-semibold tracking-wide text-black sm:text-[20px]">
                    我的優惠券
                  </h2>
                  <button
                    type="button"
                    onClick={loadAvailableCoupons}
                    className="text-[13px] text-[#2a514d] underline-offset-2 hover:underline"
                  >
                    重新整理
                  </button>
                </div>

                <div className="mb-6 flex gap-6 border-b border-[#ddd] sm:gap-8">
                  {[
                    { id: "usable", label: "可使用" },
                    { id: "used", label: "已使用" },
                    { id: "expired", label: "已過期" },
                  ].map((item) => {
                    const active = couponFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCouponFilter(item.id)}
                        className={cn(
                          "relative pb-3 text-[14px] transition-colors sm:text-[15px]",
                          active
                            ? "font-semibold text-black"
                            : "font-normal text-[#888] hover:text-black",
                        )}
                      >
                        {item.label}
                        {active && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {availableLoading ? (
                  <p className="py-12 text-center text-[14px] text-[#888]">
                    讀取中...
                  </p>
                ) : filteredCoupons.length === 0 ? (
                  <p className="py-12 text-center text-[14px] text-[#888]">
                    {couponFilter === "usable"
                      ? "目前沒有可使用的優惠券。"
                      : couponFilter === "used"
                        ? "目前沒有已使用的優惠券。"
                        : "目前沒有已過期的優惠券。"}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredCoupons.map((c) => {
                      const code = String(c.code || "").toUpperCase();
                      const name =
                        c.kindLabel ||
                        (c.kind === "welcome" || c.kind === "legacy"
                          ? "入會禮"
                          : c.kind === "birthday"
                            ? Number(c.amount) >= 300
                              ? "臻享會員生日禮"
                              : "品牌好友生日禮"
                            : "專屬優惠");
                      const expiresLabel = c.expires
                        ? new Date(c.expires).toLocaleDateString("zh-TW", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                        : "無期限";
                      const minAmt = Number(c.minimumAmount || 0) || 0;
                      const status =
                        c.statusLabel ||
                        (c.status === "used"
                          ? "已使用"
                          : c.status === "expired"
                            ? "已過期"
                            : "可使用");
                      const copied = copiedCouponCode === code;
                      return (
                        <div
                          key={code}
                          className="border border-[#ddd] bg-white p-4 sm:p-5"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[15px] font-semibold text-black">
                                {name}
                              </p>
                              <p className="mt-1 text-[18px] font-bold text-[#c0392b]">
                                {formatMoneyNT(c.amount)}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 border px-2.5 py-1 text-[12px] font-medium",
                                c.status === "usable"
                                  ? "border-[#2a514d] text-[#2a514d]"
                                  : "border-[#ccc] text-[#888]",
                              )}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="space-y-1 text-[13px] text-[#555]">
                            <p>
                              使用門檻：
                              {minAmt > 0
                                ? `單筆滿 ${formatProductPrice(minAmt)}`
                                : "無最低消費"}
                            </p>
                            <p>有效期限：{expiresLabel}</p>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eee] pt-3">
                            <p className="min-w-0 break-all font-mono text-[14px] font-bold tracking-wide text-black">
                              {code}
                            </p>
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                title="複製折扣碼"
                                onClick={() => handleCopyCoupon(code)}
                                className="border border-[#ccc] bg-white p-2 text-[#555] transition-colors hover:border-[#2a514d] hover:text-[#2a514d]"
                              >
                                <Copy size={16} />
                              </button>
                              <span
                                className={cn(
                                  "pointer-events-none absolute -top-7 right-0 whitespace-nowrap text-[11px] text-[#2a514d] transition-opacity duration-200",
                                  copied ? "opacity-100" : "opacity-0",
                                )}
                              >
                                已複製
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 訂單 Tab 內容：兩層（列表 → 詳情） */}
            {activeTab === "orders" && (
              <div className="w-full">
                {ordersLoading ? (
                  <p className="py-12 text-center text-sm text-[#888]">
                    載入訂單中...
                  </p>
                ) : selectedOrderId ? (
                  (() => {
                    const selected = orders.find((o) => String(o.id) === String(selectedOrderId));
                    if (!selected) {
                      return (
                        <div className="py-16 text-center">
                          <p className="mb-4 text-sm text-[#888]">找不到此訂單。</p>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(null)}
                            className="text-[13px] text-[#2a514d] underline"
                          >
                            返回訂單列表
                          </button>
                        </div>
                      );
                    }
                    return (
                      <OrderDetail
                        order={selected}
                        onBack={() => setSelectedOrderId(null)}
                        refreshing={orderRefreshing}
                        cancelling={
                          String(cancellingOrderId) === String(selected.id)
                        }
                        onCancelOrder={cancelOrder}
                        onRefreshPayment={() =>
                          refreshOrderPayment(selected.id)
                        }
                      />
                    );
                  })()
                ) : filteredOrders.length === 0 ? (
                  <div className="py-12 text-center sm:py-16">
                    <p className="text-[15px] text-[#888]">
                      目前尚未有任何訂單紀錄。
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop / tablet table — 圖二 */}
                    <div className="hidden overflow-x-auto bg-white sm:block">
                      <table className="w-full min-w-[760px] border-collapse text-center text-[15px]">
                        <thead>
                          <tr className="border-y border-[#e5e5e5] text-[13px] text-[#aaaaaa]">
                            <th className="px-3 py-3 font-normal">訂單編號</th>
                            <th className="px-3 py-3 font-normal">訂單日期</th>
                            <th className="px-3 py-3 font-normal">狀態</th>
                            <th className="px-3 py-3 font-normal">總金額</th>
                            <th className="px-3 py-3 font-normal">付款方式</th>
                            <th className="px-3 py-3 font-normal">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((o, idx) => (
                            <tr
                              key={o.id}
                              onClick={() => setSelectedOrderId(o.id)}
                              className={cn(
                                "cursor-pointer border-b border-[#eeeeee] text-[15px] text-[#222] transition-colors hover:bg-[#f5f5f5]",
                                idx % 2 === 1 ? "bg-[#fafafa]" : "bg-white",
                              )}
                            >
                              <td className="px-3 py-4">{o.number || o.id}</td>
                              <td className="px-3 py-4">
                                {formatOrderDate(o.date_created)}
                              </td>
                              <td className="px-3 py-4 text-[#2a514d]">
                                {getOrderStatusLabel(o)}
                              </td>
                              <td className="px-3 py-4">
                                {formatMoneyNT(Number(o.total))}
                              </td>
                              <td className="px-3 py-4">
                                {o.payment_method_title || "—"}
                              </td>
                              <td className="px-3 py-4">
                                <OrderActionButton
                                  order={o}
                                  onCancel={cancelOrder}
                                  cancelling={
                                    String(cancellingOrderId) === String(o.id)
                                  }
                                  className="h-9 px-4 text-[12px]"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile list cards */}
                    <div className="space-y-0 divide-y divide-[#e8e8e8] border-y border-[#ddd] bg-white sm:hidden">
                      {filteredOrders.map((o) => (
                        <div
                          key={o.id}
                          className="flex w-full items-center justify-between gap-3 px-1 py-4 text-left"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(o.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[15px] font-medium text-black">
                                #{o.number || o.id}
                              </p>
                              <span className="shrink-0 text-[13px] text-[#2a514d]">
                                {getOrderStatusLabel(o)}
                              </span>
                            </div>
                            <p className="mt-1 text-[12px] text-[#888]">
                              {formatOrderDate(o.date_created)} ·{" "}
                              {o.payment_method_title || "—"}
                            </p>
                            <p className="mt-1 text-[15px] font-medium">
                              {formatMoneyNT(Number(o.total))}
                            </p>
                          </button>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <OrderActionButton
                              order={o}
                              onCancel={cancelOrder}
                              cancelling={
                                String(cancellingOrderId) === String(o.id)
                              }
                              className="h-9 px-3 text-[12px]"
                            />
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(o.id)}
                              className="text-[#bbb]"
                              aria-label="查看訂單詳情"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 收藏 Tab 內容 */}
            {activeTab === "favorites" && (
              <div className="w-full">
                {wishlistItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10 text-center sm:gap-4 sm:py-14">
                    <WishlistIcon size={80} className="opacity-40 sm:h-24" />
                    <p className="text-[15px] text-[#888]">尚未收藏商品</p>
                    <Link
                      href="/products"
                      className="mt-1 inline-flex items-center bg-[#2a514d] px-6 py-2.5 text-[15px] text-white transition-colors hover:bg-[#1e3d3a]"
                    >
                      探索商品
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {wishlistItems.map((item) => (
                      <div key={item.id} className="group">
                        <Link
                          href={`/products/${item.slug}`}
                          className="relative mb-2 block aspect-[3/4] overflow-hidden bg-white"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover object-center"
                              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center opacity-30">
                              <HoverIcon name="cart" size={80} alt="" />
                            </div>
                          )}
                        </Link>

                        <div className="mt-2 min-w-0 space-y-1 px-0.5 text-left md:mt-3">
                          <div className="mb-0 flex min-h-9 min-w-0 items-center justify-between gap-2">
                            <Link
                              href={`/products/${item.slug}`}
                              className="flex min-w-0 flex-1 items-center break-words text-[14px] font-semibold leading-snug text-black line-clamp-2 hover:opacity-60 md:text-[15px]"
                            >
                              {item.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeFromWishlist(item.id)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center transition-opacity hover:opacity-60"
                              aria-label="移除收藏"
                            >
                              <WishlistIcon active size={20} />
                            </button>
                          </div>

                          {item.colorHex && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full border border-[#ccc]"
                                style={{ background: item.colorHex }}
                              />
                            </div>
                          )}

                          <p className="pt-0.5 text-[14px] font-bold text-[#222] md:text-[15px]">
                            {formatProductPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* 生日 Modal */}
      {showBirthdayModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#1a1a1a]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm sm:max-w-md bg-white rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 sm:px-5 py-4 border-b border-[#c9cccf] flex justify-between items-center bg-[#f9fafb]">
              <h3 className="text-sm sm:text-base font-bold text-[#202223] flex items-center gap-2">
                專屬壽星好禮 🎁
              </h3>
              <button
                onClick={() => setShowBirthdayModal(false)}
                className="text-[#6d7175] hover:text-[#202223] p-1 -mr-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-sm text-[#202223] mb-2 font-bold">
                您尚未設定生日！
              </p>
              <p className="text-[13px] sm:text-sm text-[#6d7175] mb-5 leading-relaxed">
                填寫生日，即可在生日當月領取專屬購物金。
                <br />
                <span className="text-rose-600 font-bold mt-1 inline-block">
                  * 生日設定後無法修改
                </span>
              </p>
              <input
                type="date"
                value={modalBirthdayInput}
                onChange={(e) => setModalBirthdayInput(e.target.value)}
                className="w-full border border-[#c9cccf] rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008060] mb-6 font-medium text-[#202223]"
              />
              <div className="flex justify-end gap-3 pt-3 border-t border-[#ebebeb]">
                <button
                  onClick={() => setShowBirthdayModal(false)}
                  className="px-4 py-2 border border-[#c9cccf] bg-white rounded-md text-xs sm:text-sm font-bold text-[#202223] hover:bg-[#f6f6f7] shadow-sm flex-1 sm:flex-none"
                >
                  稍後再說
                </button>
                <button
                  onClick={handleModalSubmit}
                  disabled={birthdayLoading || !modalBirthdayInput}
                  className="px-4 py-2 bg-[#008060] text-white rounded-md text-xs sm:text-sm font-bold hover:bg-[#006e52] shadow-sm disabled:opacity-50 flex-1 sm:flex-none"
                >
                  確認送出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe0e5] border-t-[#2a514d]" />
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}
