// app/account/page.jsx
"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/lib/wishlistStore";
import { formatProductPrice } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import HoverIcon from "@/components/hover/HoverIcon";
import WishlistIcon from "@/components/hover/WishlistIcon";
import { PasswordInput } from "@/components/hover/AuthField";
import { useShippingSettings } from "@/lib/useShippingSettings";
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
  return `NT$ ${Number(n || 0).toLocaleString("zh-TW")}`;
}
function formatMoneyDot(n) {
  return `NT.${Number(n || 0).toLocaleString("zh-TW")}`;
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
function getOrderStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "已到貨";
  if (s === "processing" || s === "paid") return "處理中";
  if (s === "pending" || s === "on-hold" || s === "待付款" || s === "waiting-payment")
    return "待付款";
  if (s === "cancelled" || s === "canceled") return "已取消";
  if (s === "refunded") return "已退款";
  if (s === "failed") return "失敗";
  return status || "—";
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
  const values = metas
    .map((m) => String(m?.value || "").trim())
    .filter(Boolean);
  return values.join(" / ");
}
const formatNTD = (val) => "NT$" + Math.round(val || 0).toLocaleString("zh-TW");
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
    } else if (s === "completed" || s === "paid" || s === "已完成") {
      label = "已完成";
      tone = "bg-[#cbe5cc] text-[#1c5c27] border-transparent";
      dotColor = "fill-[#1c5c27]";
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
          <h2 className="text-base font-semibold text-[#202223]">{title}</h2>
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
    <div className="pb-4">
      <input
        type={type}
        readOnly={readOnly}
        value={value || ""}
        onChange={onChange}
        placeholder={label}
        className={cn(
          "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none focus:border-[#2a514d]",
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
      className="mb-6 inline-block bg-[#2a514d] px-6 py-2.5 text-[13px] font-medium tracking-wide text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

const HOVER_LINE_URL = "https://line.me/R/ti/p/@330kefmm";

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

function OrderDetail({ order, onBack }) {
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
  const shippingMethod =
    order.shipping_lines?.[0]?.method_title || "依訂單配送方式";
  const isCvs =
    Boolean(storeId || storeName) ||
    /超商|cvs|全家|7-?11|萊爾富|ok/i.test(shippingMethod);
  const shippingTotal = Number(order.shipping_total || 0);
  const discountTotal = Number(order.discount_total || 0);
  const itemsSubtotal = (order.line_items || []).reduce(
    (sum, item) => sum + Number(item.subtotal || item.total || 0),
    0,
  );
  const threshold = Number(shippingSettings.freeShipThreshold || 2000);
  const freeNote =
    shippingTotal === 0 || discountTotal > 0
      ? `滿 NT.2,000 免運`
      : "";
  const discountDisplay =
    discountTotal > 0
      ? discountTotal
      : shippingTotal === 0
        ? Number(shippingSettings.homeDeliveryFee || shippingSettings.cvsFee || 85)
        : 0;
  const orderStatusLabel = getOrderStatusLabel(order.status);
  const paymentStatusLabel = getPaymentStatusLabel(order);
  const paymentTitle = order.payment_method_title || "—";
  const paidAt = formatOrderDate(order.date_paid || order.date_created, true);
  const invoiceDate = formatOrderDate(
    order.date_paid || order.date_created,
    false,
  ).replace(
    /(\d+)\/(\d+)\/(\d+)/,
    (_, y, m, d) =>
      `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`,
  );

  const InfoRow = ({ label, children, className = "", valueClassName = "" }) => (
    <div className={cn("flex items-start justify-between gap-4 py-2.5", className)}>
      <span className="w-[88px] shrink-0 text-[13px] text-[#8a8a8a]">{label}</span>
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
            <PaymentStatusBadge label={paymentStatusLabel} />
          </InfoRow>
          <InfoRow label="總金額">
            <span className="font-medium">{formatMoneyDot(order.total)}</span>
          </InfoRow>
        </div>
        <div className="px-4 pb-4 pt-2">
          <a
            href={HOVER_LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center rounded-md bg-[#2a514d] text-[14px] tracking-wide text-white transition-opacity hover:opacity-90"
          >
            聯繫客服
          </a>
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
              <PaymentStatusBadge label={paymentStatusLabel} />
            </div>
            <div>
              <p className="mb-1 text-[12px] text-[#888]">總金額</p>
              <p className="text-[15px] font-semibold">
                {formatMoneyDot(order.total)}
              </p>
            </div>
          </div>
          <a
            href={HOVER_LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 shrink-0 items-center justify-center bg-[#2a514d] px-6 text-[13px] tracking-wide text-white transition-opacity hover:opacity-85"
          >
            聯繫客服
          </a>
        </div>
      </section>

      {/* ── Mobile product card (圖一) ── */}
      <section className="mb-4 overflow-hidden rounded-lg border border-[#e4e4e4] bg-white md:hidden">
        <div className="px-4 pb-4 pt-4">
          <h3 className="mb-4 text-[15px] font-semibold text-black">商品資訊</h3>
          <div className="space-y-4">
            {(order.line_items || []).map((item, index) => {
              const variant = getItemVariantText(item);
              return (
                <div
                  key={`${order.id}-m-${index}`}
                  className="flex gap-3"
                >
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden bg-[#f5f5f3]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
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
                      <p className="text-[14px] font-medium leading-snug text-black">
                        {item.name}
                      </p>
                      {variant ? (
                        <p className="mt-1 text-[12px] text-[#888]">
                          {variant.replace(/\s*\/\s*/g, " / ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <p className="text-[12px] text-[#888]">
                        數量：{item.quantity}
                      </p>
                      <p className="shrink-0 text-[14px] font-medium text-black">
                        {formatMoneyDot(item.total)}
                      </p>
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
            <div className="flex justify-between gap-4">
              <span className="text-[#8a8a8a]">
                折扣{freeNote ? `（${freeNote}）` : ""}
              </span>
              <span className="text-[#2a514d]">
                {discountDisplay > 0
                  ? `-${formatMoneyDot(discountDisplay)}`
                  : formatMoneyDot(0)}
              </span>
            </div>
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
                        alt={item.name}
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
                      {item.name}
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
            <div className="flex justify-between gap-6">
              <span className="text-[#777]">
                折扣{freeNote ? `（${freeNote}）` : ""}
              </span>
              <span className="text-[#2a514d]">
                {discountDisplay > 0
                  ? `-${formatMoneyDot(discountDisplay)}`
                  : formatMoneyDot(0)}
              </span>
            </div>
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
            <InfoRow label="發票類型">電子發票</InfoRow>
            <InfoRow label="發票開立日期">{invoiceDate}</InfoRow>
          </div>
        </div>
      </section>

      {/* ── Desktop shipping ── */}
      <section className="mb-8 hidden border border-[#d9d9d9] bg-white px-6 py-5 md:block">
        <h3 className="mb-4 text-[15px] font-semibold text-black">
          收件 / 配送資訊
        </h3>
        <div className="grid grid-cols-2 gap-8 text-[13px] leading-relaxed">
          <div className="space-y-3">
            <p>
              <span className="text-[#888]">收件人</span>
              <span className="ml-3 text-black">{recipient}</span>
            </p>
            <p>
              <span className="text-[#888]">手機號碼</span>
              <span className="ml-3 text-black">{phone}</span>
            </p>
            {isCvs ? (
              <>
                <p>
                  <span className="text-[#888]">取件門市</span>
                  <span className="ml-3 text-black">
                    {storeName || "—"}
                    {storeId ? `（${storeId}）` : ""}
                  </span>
                </p>
                <p>
                  <span className="text-[#888]">取件地址</span>
                  <span className="ml-3 text-black">
                    {storeAddress || homeAddress}
                  </span>
                </p>
              </>
            ) : (
              <p>
                <span className="text-[#888]">收件地址</span>
                <span className="ml-3 text-black">{homeAddress}</span>
              </p>
            )}
          </div>
          <div className="space-y-3">
            <p>
              <span className="text-[#888]">配送方式</span>
              <span className="ml-3 text-black">{shippingMethod}</span>
            </p>
            <p>
              <span className="text-[#888]">發票類型</span>
              <span className="ml-3 text-black">電子發票</span>
            </p>
            <p>
              <span className="text-[#888]">發票開立日期</span>
              <span className="ml-3 text-black">{invoiceDate}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Mobile payment card (圖一) ── */}
      <section className="mb-2 overflow-hidden rounded-lg border border-[#e4e4e4] bg-white md:hidden">
        <div className="px-4 py-4">
          <h3 className="mb-3 text-[15px] font-semibold text-black">付款資訊</h3>
          <div className="divide-y divide-[#f0f0f0]">
            <InfoRow label="付款方式">{paymentTitle}</InfoRow>
            <InfoRow label="付款時間">{paidAt}</InfoRow>
          </div>
        </div>
      </section>

      {/* ── Desktop payment ── */}
      <section className="hidden border border-[#d9d9d9] bg-white px-6 py-5 md:block">
        <h3 className="mb-4 text-[15px] font-semibold text-black">付款資訊</h3>
        <div className="space-y-3 text-[13px] leading-relaxed">
          <p>
            <span className="text-[#888]">付款方式</span>
            <span className="ml-3 text-black">{paymentTitle}</span>
          </p>
          <p>
            <span className="text-[#888]">付款時間</span>
            <span className="ml-3 text-black">{paidAt}</span>
          </p>
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
        "relative px-1 pb-3 text-[14px] transition-colors whitespace-nowrap",
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


/** 設計稿示範訂單（圖二列表 + 圖一詳情） */
const DEMO_ACCOUNT_ORDERS = [
  {
    id: 1352,
    number: "1352",
    status: "processing",
    date_created: "2026-06-10T14:32:00",
    date_paid: "2026-06-10T14:32:00",
    total: "1680",
    currency: "TWD",
    payment_method_title: "ATM",
    customer_note: "",
    billing: {
      first_name: "昆壁",
      last_name: "葉",
      phone: "0939767977",
      email: "demo@hover.tw",
    },
    shipping: {
      first_name: "昆壁",
      last_name: "葉",
      phone: "0939767977",
      address_1: "府中路 29-1 號 1 樓",
      city: "板橋區",
      state: "新北市",
      postcode: "220",
    },
    shipping_total: "85",
    discount_total: "85",
    shipping_lines: [{ method_title: "全家超商取貨", total: "85" }],
    coupon_lines: [],
    payment_info: {},
    meta_data: [
      { key: "_shipping_cvs_store_ID", value: "002816" },
      { key: "_shipping_cvs_store_name", value: "全家 板橋板農店" },
      {
        key: "_shipping_cvs_store_address",
        value: "新北市板橋區府中路 29-1 號 1 樓",
      },
    ],
    line_items: [
      {
        name: "經典刺繡短袖 T 恤",
        quantity: 1,
        total: "1680",
        subtotal: "1680",
        price: 1680,
        image: "/images/hover/product-1.jpg",
        product_id: 1001,
        sku: "HOVER-TEE-001",
        variation_id: 0,
        meta_data: [
          { key: "尺寸", value: "S" },
          { key: "顏色", value: "黑" },
        ],
      },
    ],
  },
  {
    id: 1351,
    number: "1351",
    status: "processing",
    date_created: "2026-08-22T11:20:00",
    date_paid: "2026-08-22T11:20:00",
    total: "1765",
    currency: "TWD",
    payment_method_title: "信用卡",
    customer_note: "",
    billing: {
      first_name: "昆壁",
      last_name: "葉",
      phone: "0939767977",
      email: "demo@hover.tw",
    },
    shipping: {
      first_name: "昆壁",
      last_name: "葉",
      phone: "0939767977",
      address_1: "府中路 29-1 號 1 樓",
      city: "板橋區",
      state: "新北市",
      postcode: "220",
    },
    shipping_total: "85",
    discount_total: "0",
    shipping_lines: [{ method_title: "全家超商取貨", total: "85" }],
    coupon_lines: [],
    payment_info: {},
    meta_data: [
      { key: "_shipping_cvs_store_ID", value: "002816" },
      { key: "_shipping_cvs_store_name", value: "全家 板橋板農店" },
      {
        key: "_shipping_cvs_store_address",
        value: "新北市板橋區府中路 29-1 號 1 樓",
      },
    ],
    line_items: [
      {
        name: "經典刺繡短袖 T 恤",
        quantity: 1,
        total: "1680",
        subtotal: "1680",
        price: 1680,
        image: "/images/hover/product-1.jpg",
        product_id: 1001,
        sku: "HOVER-TEE-001",
        variation_id: 0,
        meta_data: [
          { key: "尺寸", value: "M" },
          { key: "顏色", value: "黑" },
        ],
      },
    ],
  },
  {
    id: 1320,
    number: "1320",
    status: "completed",
    date_created: "2026-08-16T09:05:00",
    date_paid: "2026-08-16T09:05:00",
    total: "1765",
    currency: "TWD",
    payment_method_title: "綠界科技 ECPay",
    customer_note: "",
    billing: {
      first_name: "昆壁",
      last_name: "葉",
      phone: "0939767977",
      email: "demo@hover.tw",
    },
    shipping: {
      first_name: "昆壁",
      last_name: "葉",
      phone: "0939767977",
      address_1: "府中路 29-1 號 1 樓",
      city: "板橋區",
      state: "新北市",
      postcode: "220",
    },
    shipping_total: "85",
    discount_total: "0",
    shipping_lines: [{ method_title: "全家超商取貨", total: "85" }],
    coupon_lines: [],
    payment_info: {},
    meta_data: [
      { key: "_shipping_cvs_store_ID", value: "002816" },
      { key: "_shipping_cvs_store_name", value: "全家 板橋板農店" },
      {
        key: "_shipping_cvs_store_address",
        value: "新北市板橋區府中路 29-1 號 1 樓",
      },
    ],
    line_items: [
      {
        name: "經典刺繡短袖 T 恤",
        quantity: 1,
        total: "1680",
        subtotal: "1680",
        price: 1680,
        image: "/images/hover/product-2.jpg",
        product_id: 1001,
        sku: "HOVER-TEE-001",
        variation_id: 0,
        meta_data: [
          { key: "尺寸", value: "L" },
          { key: "顏色", value: "米白" },
        ],
      },
    ],
  },
];

export default function AccountPage() {
  const router = useRouter();
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

  const [birthdayInput, setBirthdayInput] = useState("");
  const [isSettingBirthday, setIsSettingBirthday] = useState(false);
  const [birthdayLoading, setBirthdayLoading] = useState(false);
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
      // TODO: 對稿完成後改回只用 remote；目前注入設計稿三筆訂單
      setOrders(DEMO_ACCOUNT_ORDERS);
      setOrdersDebug(data?.debug || { demo: true, remoteCount: remote.length });
    } catch {
      setOrders(DEMO_ACCOUNT_ORDERS);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

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
      if (res.ok && data?.ok && Array.isArray(data.available))
        setAvailableCoupons(data.available);
      else setAvailableCoupons([]);
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
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "admin") {
      router.replace("/account", { scroll: false });
      setActiveTab("profile");
      return;
    }
    if (tab && ["profile", "orders", "favorites"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [router]);

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
    if (!birthdayInput) return alert("請選擇生日");
    if (!confirm(`您的生日是 ${birthdayInput} 嗎？\n確認後將無法再次修改。`))
      return;
    setBirthdayLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday: birthdayInput }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("生日設定成功！");
        setCustomer((prev) =>
          prev ? { ...prev, birthday: birthdayInput } : null,
        );
        setIsSettingBirthday(false);
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
      const url = tab === "profile" ? "/account" : `/account?tab=${tab}`;
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const sortedCoupons = useMemo(() => {
    return [...availableCoupons].sort(
      (a, b) => pickCouponCreatedAt(b) - pickCouponCreatedAt(a),
    );
  }, [availableCoupons]);

  const filteredCoupons = useMemo(() => {
    let base = sortedCoupons;
    if (searchQuery && activeTab === "profile") {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (c) => c.code.toLowerCase().includes(q) || String(c.amount).includes(q),
      );
    }
    const previewLimit = 6;
    return showAllReferralCoupons || (searchQuery && activeTab === "profile")
      ? base
      : base.slice(0, previewLimit);
  }, [sortedCoupons, showAllReferralCoupons, searchQuery, activeTab]);

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

  const getSearchPlaceholder = () => {
    if (activeTab === "orders") return "搜尋訂單...";
    return "搜尋代碼...";
  };

  return (
    <div className="min-h-screen bg-hover-bg pb-16 text-black">
      <div className="mx-auto max-w-[960px] px-4 py-10 sm:px-6 sm:py-14">
        {/* Page title */}
        <h1 className="mb-8 text-center text-[22px] font-semibold tracking-wide sm:text-[26px]">
          我的會員中心
        </h1>

        {/* Tab bar + logout */}
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-[#ccc]">
          <div className="flex gap-6 overflow-x-auto pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-10">
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
              訂單查詢/申請退貨
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
            className="mb-3 flex shrink-0 items-center gap-1.5 text-[13px] text-[#c0392b] transition-opacity hover:opacity-70"
          >
            <LogOut size={15} strokeWidth={1.5} />
            登出
          </button>
        </div>

        {/* Mobile search */}
        {((activeTab === "orders" && !selectedOrderId) || activeTab === "profile") && (
          <div className="relative mb-6 md:hidden">
            <HoverIcon name="search" size={40} className="absolute left-0 top-1/2 -translate-y-1/2 opacity-50" alt="" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getSearchPlaceholder()}
              className="w-full border-0 border-b border-[#bbb] bg-transparent py-2 pl-7 text-sm outline-none focus:border-black"
            />
          </div>
        )}

        <div className="w-full">
            {/* 個人資料 Tab */}
            {activeTab === "profile" && (
              <>
                {/* Summary row */}
                <div className="mb-10 flex flex-col gap-6 border-b border-[#ddd] pb-8 sm:flex-row sm:items-center sm:justify-between">
                  <div className="sm:max-w-[280px]">
                    <div className="mb-3 inline-block border border-[#ccc] bg-white px-4 py-2 text-[13px] font-medium">
                      {getTierDisplay(membership?.tierName, membership)}
                      {membership?.tierLabelEn && (
                        <span className="ml-2 text-[11px] font-normal text-[#888]">
                          {membership.tierLabelEn}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed text-[#555]">
                      {membership?.renewNeedAmount != null && membership?.exclusiveActive
                        ? `臻享效期內再消費 NT$${membership.renewNeedAmount.toLocaleString()} 即可續會`
                        : membership?.nextNeedAmount != null && membership?.nextTierName
                          ? `近 12 個月再消費 NT$${membership.nextNeedAmount.toLocaleString()} 即可升級 ${getTierDisplay(membership.nextTierName)}`
                          : membership?.exclusiveActive
                            ? "您已是臻享會員，享正價商品 95 折"
                            : "註冊即為品牌好友，永久有效"}
                    </p>
                    <Link
                      href="/membership"
                      className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#555] underline-offset-2 hover:underline"
                    >
                      了解品牌與會員制度 ▶
                    </Link>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
                    <div>
                      <p className="mb-1 text-[11px] text-[#888]">累積消費總額</p>
                      <p className="text-[15px] font-semibold">
                        {formatMoneyNT(orderStats.totalSpent)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] text-[#888]">訂單總數</p>
                      <p className="text-[15px] font-semibold">{orderStats.total}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] text-[#888]">已完成訂單</p>
                      <p className="text-[15px] font-semibold">{orderStats.completed}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] text-[#888]">待付款</p>
                      <p className="text-[15px] font-semibold">{orderStats.pending}</p>
                    </div>
                  </div>
                </div>

                {/* Profile + password columns */}
                <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
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
                    <HoverUnderlineField
                      label="生日"
                      value={customer?.birthday || "未設定"}
                      type={customer?.birthday ? "date" : "text"}
                      readOnly
                    />
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
                    {!customer?.birthday && (
                      <div className="mt-4">
                        {!isSettingBirthday ? (
                          <button
                            type="button"
                            onClick={() => setIsSettingBirthday(true)}
                            className="text-[13px] text-[#2a514d] underline underline-offset-2 hover:opacity-70"
                          >
                            設定生日（設定後無法修改）
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <input
                              type="date"
                              value={birthdayInput}
                              onChange={(e) => setBirthdayInput(e.target.value)}
                              className="w-full border-0 border-b border-[#bbb] bg-transparent pb-2 text-sm outline-none focus:border-black"
                            />
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={handleUpdateBirthday}
                                disabled={birthdayLoading}
                                className="bg-[#2a514d] px-4 py-2 text-[13px] text-white hover:bg-[#1e3d3a] disabled:opacity-50"
                              >
                                {birthdayLoading ? "儲存中..." : "確認"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsSettingBirthday(false)}
                                className="text-[13px] text-[#888] hover:text-black"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    {authProvider ? (
                      <>
                        <div className="mb-6 inline-block bg-[#2a514d] px-6 py-2.5 text-[13px] font-medium tracking-wide text-white">
                          登入方式
                        </div>
                        <p className="text-[14px] leading-relaxed text-[#333]">
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
                                "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none focus:border-[#2a514d]",
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
                                "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none focus:border-[#2a514d]",
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
                                "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none focus:border-[#2a514d]",
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
                          className="mt-4 inline-block text-[13px] text-[#2a514d] underline underline-offset-2 hover:opacity-70"
                        >
                          忘記密碼？前往重設
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* 獎勵與優惠券 */}
                <div>
                  <ShellCard title="獎勵與優惠券">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-[#ebebeb] pb-3">
                          <div className="min-w-0 pr-3">
                            <p className="text-sm font-medium text-[#202223]">
                              入會禮（購物金）
                            </p>
                            <p className="text-xs font-bold text-amber-600 mt-0.5">
                              NT$ {membership?.welcomeGift ?? membership?.upgradeGift ?? 0}
                            </p>
                            <p className="text-[10px] text-[#6d7175] mt-0.5">
                              單筆滿 NT$1,000 可使用 · 註冊後自動發放
                            </p>
                            {(() => {
                              const welcome = availableCoupons.find(
                                (c) =>
                                  c.kind === "welcome" || c.kind === "legacy",
                              );
                              return welcome ? (
                                <p className="mt-1.5 font-mono text-[12px] font-bold text-[#202223] break-all">
                                  {String(welcome.code).toUpperCase()}
                                </p>
                              ) : null;
                            })()}
                          </div>
                          {(membership?.welcomeGift ?? membership?.upgradeGift) ? (
                            claimed.welcome ||
                            availableCoupons.some(
                              (c) =>
                                c.kind === "welcome" || c.kind === "legacy",
                            ) ? (
                              <span className="px-3 py-1.5 rounded-md text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200 shrink-0">
                                已發放
                              </span>
                            ) : (
                              <button
                                onClick={() => handleClaim("welcome")}
                                disabled={claimLoading.welcome}
                                className="px-3 py-1.5 rounded-md text-xs font-bold transition-all border shadow-sm bg-white text-[#202223] border-[#c9cccf] hover:bg-[#f6f6f7] shrink-0"
                              >
                                {claimLoading.welcome ? "處理中..." : "領取入會禮"}
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-[#6d7175]">—</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-b border-[#ebebeb] pb-3">
                          <div className="min-w-0 pr-3">
                            <p className="text-sm font-medium text-[#202223]">
                              生日禮
                            </p>
                            <p className="text-xs font-bold text-rose-600 mt-0.5">
                              {membership?.birthdayCredit ?? 0} 元
                            </p>
                            {(() => {
                              const bday = availableCoupons.find(
                                (c) => c.kind === "birthday",
                              );
                              return bday ? (
                                <p className="mt-1.5 font-mono text-[12px] font-bold text-[#202223] break-all">
                                  {String(bday.code).toUpperCase()}
                                </p>
                              ) : null;
                            })()}
                          </div>
                          {customer?.birthday && membership?.birthdayCredit ? (
                            claimed.birthday ||
                            availableCoupons.some((c) => c.kind === "birthday") ? (
                              <span className="px-3 py-1.5 rounded-md text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200 shrink-0">
                                已發放
                              </span>
                            ) : isCurrentMonthBirthday ? (
                              <button
                                onClick={() => handleClaim("birthday")}
                                disabled={claimLoading.birthday}
                                className="px-3 py-1.5 rounded-md text-xs font-bold transition-all border shadow-sm bg-white text-[#202223] border-[#c9cccf] hover:bg-[#f6f6f7] shrink-0"
                              >
                                {claimLoading.birthday ? "處理中..." : "領取好禮"}
                              </button>
                            ) : (
                              <span className="text-[10px] bg-[#f9fafb] border border-[#e1e3e5] text-[#6d7175] px-2 py-1 rounded text-center whitespace-nowrap">
                                限 {getBirthMonthLabel(customer.birthday)} 領取
                              </span>
                            )
                          ) : null}
                        </div>

                        {claimMessage && (
                          <div
                            className={cn(
                              "p-3 rounded-md border text-sm animate-in fade-in",
                              claimStatus === "success"
                                ? "bg-[#cbe5cc]/30 border-[#1c5c27]/20 text-[#1c5c27]"
                                : "bg-rose-50 border-rose-200 text-rose-700",
                            )}
                          >
                            <p className="font-bold">{claimMessage}</p>
                            {claimedCode && (
                              <p className="text-xs mt-1 font-mono bg-white/50 px-1.5 py-0.5 rounded border border-current w-fit break-all">
                                折扣碼: {claimedCode}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-1">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-bold text-[#202223]">
                              可用優惠碼
                            </span>
                            <button
                              onClick={loadAvailableCoupons}
                              className="text-xs text-[#2c6ecb] hover:underline"
                            >
                              刷新清單
                            </button>
                          </div>
                          <p className="text-[11px] text-[#6d7175] mb-3 leading-relaxed">
                            入會禮、生日禮會自動發放至此。結帳時請手動輸入或複製折扣碼。
                          </p>
                          {availableLoading ? (
                            <p className="text-xs text-[#6d7175] py-2">
                              讀取中...
                            </p>
                          ) : filteredCoupons.length === 0 ? (
                            <p className="text-xs text-[#6d7175] bg-[#f9fafb] p-3 rounded-md border border-[#e1e3e5] text-center leading-relaxed">
                              目前沒有可用優惠碼。
                              <br />
                              新會員入會禮註冊後自動入帳；生日禮於生日月發放。
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2.5 w-full">
                              {filteredCoupons.map((c) => {
                                const kindText =
                                  c.kindLabel ||
                                  (c.kind === "welcome" || c.kind === "legacy"
                                    ? "入會禮"
                                    : c.kind === "birthday"
                                      ? "生日禮"
                                      : c.kind === "promo"
                                        ? "活動優惠"
                                        : c.kind === "ref_friend"
                                          ? "推薦禮"
                                          : "折扣券");
                                const expiresLabel = c.expires
                                  ? new Date(c.expires).toLocaleDateString(
                                      "zh-TW",
                                      {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                      },
                                    )
                                  : null;
                                const minAmt =
                                  Number(c.minimumAmount || 0) || 0;
                                return (
                                  <div
                                    key={c.code}
                                    className="border border-[#c9cccf] rounded-md p-3 bg-[#f9fafb] hover:shadow-sm w-full"
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="inline-flex items-center rounded-full bg-white border border-[#e1e3e5] px-2 py-0.5 text-[10px] font-bold text-[#2a514d]">
                                            {kindText}
                                          </span>
                                          <span className="font-bold text-rose-600 text-sm">
                                            {formatMoneyNT(c.amount)}
                                          </span>
                                        </div>
                                        <p className="mt-2 font-mono text-[13px] font-bold tracking-wide text-[#202223] break-all">
                                          {String(c.code || "").toUpperCase()}
                                        </p>
                                        <p className="mt-1 text-[11px] text-[#6d7175] leading-relaxed">
                                          {minAmt > 0
                                            ? `滿 NT$${minAmt.toLocaleString()} 可用`
                                            : "無最低消費"}
                                          {expiresLabel
                                            ? ` · 效期至 ${expiresLabel}`
                                            : ""}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        title="複製折扣碼"
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            String(c.code || "").toUpperCase(),
                                          );
                                          setClaimMessage("已複製折扣碼");
                                          setClaimStatus("success");
                                          setClaimedCode(
                                            String(c.code || "").toUpperCase(),
                                          );
                                        }}
                                        className="text-[#5c5f62] hover:text-[#008060] bg-white border border-[#c9cccf] p-2 rounded shadow-sm shrink-0"
                                      >
                                        <Copy size={16} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </ShellCard>
                </div>
              </>
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
                      />
                    );
                  })()
                ) : filteredOrders.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm text-[#888]">
                      {searchQuery
                        ? "找不到符合條件的訂單。"
                        : "目前尚未有任何訂單紀錄。"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop / tablet table — 圖二 */}
                    <div className="hidden overflow-x-auto bg-white sm:block">
                      <table className="w-full min-w-[680px] border-collapse text-center text-[13px]">
                        <thead>
                          <tr className="border-y border-[#e5e5e5] text-[12px] text-[#aaaaaa]">
                            <th className="px-3 py-3 font-normal">訂單編號</th>
                            <th className="px-3 py-3 font-normal">日期</th>
                            <th className="px-3 py-3 font-normal">狀態</th>
                            <th className="px-3 py-3 font-normal">總金額</th>
                            <th className="px-3 py-3 font-normal">付款方式</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((o, idx) => (
                            <tr
                              key={o.id}
                              onClick={() => setSelectedOrderId(o.id)}
                              className={cn(
                                "cursor-pointer border-b border-[#eeeeee] text-[13px] text-[#222] transition-colors hover:bg-[#f5f5f5]",
                                idx % 2 === 1 ? "bg-[#fafafa]" : "bg-white",
                              )}
                            >
                              <td className="px-3 py-4">{o.number || o.id}</td>
                              <td className="px-3 py-4">
                                {formatOrderDate(o.date_created)}
                              </td>
                              <td className="px-3 py-4">
                                {getOrderStatusLabel(o.status)}
                              </td>
                              <td className="px-3 py-4">
                                {formatMoneyNT(Number(o.total))}
                              </td>
                              <td className="px-3 py-4">
                                {o.payment_method_title || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile list cards — 圖二資訊結構 */}
                    <div className="space-y-0 divide-y divide-[#e8e8e8] border-y border-[#ddd] bg-white sm:hidden">
                      {filteredOrders.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setSelectedOrderId(o.id)}
                          className="flex w-full items-center justify-between gap-3 px-1 py-4 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-black">
                              #{o.number || o.id}
                            </p>
                            <p className="mt-1 text-[12px] text-[#888]">
                              {formatOrderDate(o.date_created)} ·{" "}
                              {getOrderStatusLabel(o.status)}
                            </p>
                            <p className="mt-1 text-[12px] text-[#666]">
                              {o.payment_method_title || "—"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="text-[14px] font-medium">
                              {formatMoneyNT(Number(o.total))}
                            </span>
                            <ChevronRight size={16} className="text-[#bbb]" />
                          </div>
                        </button>
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
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <WishlistIcon size={96} className="opacity-40" />
                    <p className="text-sm text-[#888]">尚無收藏商品</p>
                    <Link
                      href="/products"
                      className="mt-2 inline-flex items-center gap-2 bg-[#2a514d] px-6 py-2.5 text-sm text-white transition-colors hover:bg-[#1e3d3a]"
                    >
                      <HoverIcon name="cart" size={32} alt="" />
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
                              className="object-contain"
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
                              className="flex min-w-0 flex-1 items-center break-words text-[12px] font-semibold leading-snug text-black line-clamp-2 hover:opacity-60 md:text-[13px]"
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

                          <p className="pt-0.5 text-[12px] font-bold text-[#222] md:text-[13px]">
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
