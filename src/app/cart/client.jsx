// app/cart/client.jsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Truck,
  CreditCard,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Crown,
  AlertCircle,
  Heart,
} from "lucide-react";
import { useCartStore } from "@/lib/cartStore";

// ✅ 內建輕量版：台灣縣市與鄉鎮區字典
const TW_CITIES = {
  基隆市: [
    "仁愛區",
    "信義區",
    "中正區",
    "中山區",
    "安樂區",
    "暖暖區",
    "七堵區",
  ],
  臺北市: [
    "中正區",
    "大同區",
    "中山區",
    "松山區",
    "大安區",
    "萬華區",
    "信義區",
    "士林區",
    "北投區",
    "內湖區",
    "南港區",
    "文山區",
  ],
  新北市: [
    "板橋區",
    "三重區",
    "中和區",
    "永和區",
    "新莊區",
    "新店區",
    "樹林區",
    "鶯歌區",
    "三峽區",
    "淡水區",
    "汐止區",
    "瑞芳區",
    "土城區",
    "蘆洲區",
    "五股區",
    "泰山區",
    "林口區",
    "深坑區",
    "石碇區",
    "坪林區",
    "三芝區",
    "石門區",
    "八里區",
    "平溪區",
    "雙溪區",
    "貢寮區",
    "金山區",
    "萬里區",
    "烏來區",
  ],
  桃園市: [
    "桃園區",
    "中壢區",
    "大溪區",
    "楊梅區",
    "蘆竹區",
    "大園區",
    "龜山區",
    "八德區",
    "平鎮區",
    "新屋區",
    "觀音區",
    "復興區",
  ],
  新竹市: ["東區", "北區", "香山區"],
  新竹縣: [
    "竹北市",
    "竹東鎮",
    "新埔鎮",
    "關西鎮",
    "湖口鄉",
    "新豐鄉",
    "芎林鄉",
    "橫山鄉",
    "北埔鄉",
    "寶山鄉",
    "五峰鄉",
    "尖石鄉",
    "峨眉鄉",
  ],
  苗栗縣: [
    "苗栗市",
    "苑裡鎮",
    "通霄鎮",
    "竹南鎮",
    "頭份市",
    "後龍鎮",
    "卓蘭鎮",
    "大湖鄉",
    "公館鄉",
    "銅鑼鄉",
    "南庄鄉",
    "頭屋鄉",
    "三義鄉",
    "西湖鄉",
    "造橋鄉",
    "三灣鄉",
    "獅潭鄉",
    "泰安鄉",
  ],
  臺中市: [
    "中區",
    "東區",
    "南區",
    "西區",
    "北區",
    "西屯區",
    "南屯區",
    "北屯區",
    "豐原區",
    "東勢區",
    "大甲區",
    "清水區",
    "沙鹿區",
    "梧棲區",
    "后里區",
    "神岡區",
    "潭子區",
    "大雅區",
    "新社區",
    "石岡區",
    "外埔區",
    "大安區",
    "烏日區",
    "大肚區",
    "龍井區",
    "霧峰區",
    "太平區",
    "大里區",
    "和平區",
  ],
  彰化縣: [
    "彰化市",
    "鹿港鎮",
    "和美鎮",
    "線西鄉",
    "伸港鄉",
    "福興鄉",
    "秀水鄉",
    "花壇鄉",
    "芬園鄉",
    "員林市",
    "大村鄉",
    "埔鹽鄉",
    "埔心鄉",
    "永靖鄉",
    "社頭鄉",
    "二水鄉",
    "田尾鄉",
    "埤頭鄉",
    "芳苑鄉",
    "二林鎮",
    "大城鄉",
    "竹塘鄉",
    "溪州鄉",
    "田中鎮",
    "北斗鎮",
    "溪湖鎮",
  ],
  南投縣: [
    "南投市",
    "埔里鎮",
    "草屯鎮",
    "竹山鎮",
    "集集鎮",
    "名間鄉",
    "鹿谷鄉",
    "中寮鄉",
    "魚池鄉",
    "國姓鄉",
    "水里鄉",
    "信義鄉",
    "仁愛鄉",
  ],
  雲林縣: [
    "斗六市",
    "斗南鎮",
    "虎尾鎮",
    "西螺鎮",
    "土庫鎮",
    "北港鎮",
    "古坑鄉",
    "大埤鄉",
    "莿桐鄉",
    "林內鄉",
    "二崙鄉",
    "崙背鄉",
    "麥寮鄉",
    "東勢鄉",
    "褒忠鄉",
    "臺西鄉",
    "元長鄉",
    "四湖鄉",
    "口湖鄉",
    "水林鄉",
  ],
  嘉義市: ["東區", "西區"],
  嘉義縣: [
    "太保市",
    "朴子市",
    "布袋鎮",
    "大林鎮",
    "民雄鄉",
    "溪口鄉",
    "新港鄉",
    "六腳鄉",
    "東石鄉",
    "義竹鄉",
    "鹿草鄉",
    "水上鄉",
    "中埔鄉",
    "竹崎鄉",
    "梅山鄉",
    "番路鄉",
    "大埔鄉",
    "阿里山鄉",
  ],
  臺南市: [
    "新營區",
    "鹽水區",
    "白河區",
    "柳營區",
    "後壁區",
    "東山區",
    "麻豆區",
    "下營區",
    "六甲區",
    "官田區",
    "大內區",
    "佳里區",
    "學甲區",
    "西港區",
    "七股區",
    "將軍區",
    "北門區",
    "新化區",
    "善化區",
    "新市區",
    "安定區",
    "山上區",
    "玉井區",
    "楠西區",
    "南化區",
    "左鎮區",
    "仁德區",
    "歸仁區",
    "關廟區",
    "龍崎區",
    "永康區",
    "東區",
    "南區",
    "北區",
    "安南區",
    "安平區",
    "中西區",
  ],
  高雄市: [
    "鹽埕區",
    "鼓山區",
    "左營區",
    "楠梓區",
    "三民區",
    "新興區",
    "前金區",
    "苓雅區",
    "前鎮區",
    "前鎮區",
    "旗津區",
    "小港區",
    "鳳山區",
    "林園區",
    "大寮區",
    "大樹區",
    "大社區",
    "仁武區",
    "鳥松區",
    "岡山區",
    "橋頭區",
    "燕巢區",
    "田寮區",
    "阿蓮區",
    "路竹區",
    "湖內區",
    "茄萣區",
    "永安區",
    "彌陀區",
    "梓官區",
    "旗山區",
    "美濃區",
    "六龜區",
    "甲仙區",
    "杉林區",
    "內門區",
    "茂林區",
    "桃源區",
    "那瑪夏區",
  ],
  屏東縣: [
    "屏東市",
    "潮州鎮",
    "東港鎮",
    "恆春鎮",
    "萬丹鄉",
    "長治鄉",
    "麟洛鄉",
    "九如鄉",
    "里港鄉",
    "鹽埔鄉",
    "高樹鄉",
    "萬巒鄉",
    "內埔鄉",
    "竹田鄉",
    "新埤鄉",
    "枋寮鄉",
    "新園鄉",
    "崁頂鄉",
    "林邊鄉",
    "南州鄉",
    "佳冬鄉",
    "琉球鄉",
    "車城鄉",
    "滿州鄉",
    "枋山鄉",
    "三地門鄉",
    "霧臺鄉",
    "瑪家鄉",
    "泰武鄉",
    "來義鄉",
    "春日鄉",
    "獅子鄉",
    "牡丹鄉",
  ],
  宜蘭縣: [
    "宜蘭市",
    "羅東鎮",
    "蘇澳鎮",
    "頭城鎮",
    "礁溪鄉",
    "壯圍鄉",
    "員山鄉",
    "冬山鄉",
    "五結鄉",
    "三星鄉",
    "大同鄉",
    "南澳鄉",
  ],
  花蓮縣: [
    "花蓮市",
    "鳳林鎮",
    "玉里鎮",
    "新城鄉",
    "吉安鄉",
    "壽豐鄉",
    "光復鄉",
    "豐濱鄉",
    "瑞穗鄉",
    "富里鄉",
    "秀林鄉",
    "萬榮鄉",
    "卓溪鄉",
  ],
  臺東縣: [
    "臺東市",
    "成功鎮",
    "關山鎮",
    "卑南鄉",
    "鹿野鄉",
    "池上鄉",
    "東河鄉",
    "長濱鄉",
    "太麻里鄉",
    "大武鄉",
    "綠島鄉",
    "海端鄉",
    "延平鄉",
    "金峰鄉",
    "達仁鄉",
    "蘭嶼鄉",
  ],
  澎湖縣: ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"],
  金門縣: ["金城鎮", "金湖鎮", "金沙鎮", "金寧鄉", "烈嶼鄉", "烏坵鄉"],
  連江縣: ["南竿鄉", "北竿鄉", "莒光鄉", "東引鄉"],
};

const currency = (n) =>
  `NT$${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("zh-TW")}`;

// 會員折扣表
const TIER_DISCOUNTS = {
  U銅貴賓: 1,
  U銀貴賓: 0.98,
  U金貴賓: 0.95,
  UVIP貴賓: 0.9,
  UVVIP貴賓: 0.88,
};

// 工具函數
function isUpgradeCode(code) {
  return String(code || "")
    .toLowerCase()
    .startsWith("ufup-");
}
function isBirthdayCode(code) {
  return String(code || "")
    .toLowerCase()
    .startsWith("ufbd-");
}
function isReferralAmbCode(code) {
  return String(code || "")
    .toLowerCase()
    .startsWith("ufamb-");
}
function isReferralFriendCode(code) {
  return String(code || "")
    .toLowerCase()
    .startsWith("uffrd-");
}

function couponTitleByKindOrCode(c) {
  const code = String(c?.code || "");
  const kind = String(c?.kind || "").toLowerCase();
  const amount = Number(c?.amount) || 0;
  if (kind === "upgrade" || isUpgradeCode(code))
    return `升等禮金 - ${currency(amount)}`;
  if (kind === "birthday" || isBirthdayCode(code))
    return `專屬生日禮 - ${currency(amount)}`;
  if (kind === "ref_ambassador_200" || isReferralAmbCode(code))
    return `推薦回饋金 - ${currency(amount)}`;
  if (kind === "ref_friend_50" || isReferralFriendCode(code))
    return `新客註冊禮 - ${currency(amount)}`;
  return `專屬折扣碼 - ${currency(amount)}`;
}

// 核心計算邏輯
function calcPricing(
  items,
  { shippingBase = 80, freeShipThreshold = 1500 },
  couponDiscount = 0,
  tierDiscountRate = 1,
) {
  const subtotal = items.reduce(
    (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0),
    0,
  );
  let memberDiscountAmount = 0;
  if (tierDiscountRate < 1 && subtotal > 0)
    memberDiscountAmount = Math.round(subtotal * (1 - tierDiscountRate));

  const subtotalAfterMember = Math.max(0, subtotal - memberDiscountAmount);
  const safeCouponDiscount = Math.min(
    Math.max(Number(couponDiscount) || 0, 0),
    subtotalAfterMember,
  );
  const finalSubtotal = Math.max(0, subtotalAfterMember - safeCouponDiscount);
  // 如果小計大於等於免運門檻，或購物車為空，則運費為 0
  const shipping =
    finalSubtotal >= freeShipThreshold || finalSubtotal === 0
      ? 0
      : shippingBase;
  const total = finalSubtotal + shipping;
  const needForFreeShip = Math.max(0, freeShipThreshold - finalSubtotal);

  return {
    subtotal,
    memberDiscountAmount,
    couponDiscount: safeCouponDiscount,
    discountedSubtotal: finalSubtotal,
    shipping,
    total,
    needForFreeShip,
    freeShipThreshold,
  };
}

// UI Components
function Input({ label, error, ...props }) {
  return (
    <div className="w-full">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
        {label} {props.required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...props}
        className={`w-full bg-white border ${
          error ? "border-red-500" : "border-gray-200"
        } rounded-lg px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-[#2a514d] outline-none ${
          props.readOnly
            ? "bg-gray-50 text-gray-500 cursor-not-allowed border-dashed" // 🌟 已經自帶漂亮的 ReadOnly 樣式
            : ""
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
}

function Select({ label, error, options = [], value, onChange, placeholder }) {
  return (
    <div className="w-full">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <select
        value={value}
        onChange={onChange}
        className={`w-full bg-white border ${
          error ? "border-red-500" : "border-gray-200"
        } rounded-lg px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-[#2a514d] outline-none appearance-none`}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
}

function CouponPicker({
  title = "可用折價券",
  subtitle,
  coupons,
  applied,
  onApply,
  onClear,
  loading,
  emptyText = "目前沒有可用折價券",
}) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-black text-gray-900 tracking-wide">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] text-gray-400 mt-0.5">{subtitle}</div>
          )}
        </div>
        {applied ? (
          <button
            type="button"
            className="text-xs font-black text-gray-500 underline underline-offset-4 hover:text-gray-900"
            onClick={onClear}
          >
            取消套用
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="text-xs text-gray-400 animate-pulse">讀取錢包中…</div>
      ) : coupons.length === 0 ? (
        <div className="text-xs text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
          {emptyText}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {coupons.map((c) => {
            const isActive =
              String(applied?.code || "").toLowerCase() ===
              String(c.code || "").toLowerCase();
            const amount = Number(c.amount) || 0;
            const kind = String(c.kind || "").toLowerCase();
            const code = String(c.code || "").toLowerCase();

            let theme = {
              bar: "bg-gray-800",
              text: "text-gray-800",
              light: "bg-gray-50",
              border: "border-gray-200",
              ring: "ring-gray-800",
              label: "專屬優惠",
            };
            if (kind === "upgrade" || code.startsWith("ufup-"))
              theme = {
                bar: "bg-amber-500",
                text: "text-amber-700",
                light: "bg-amber-50",
                border: "border-amber-200",
                ring: "ring-amber-500",
                label: "升等禮金",
              };
            else if (kind === "birthday" || code.startsWith("ufbd-"))
              theme = {
                bar: "bg-rose-500",
                text: "text-rose-700",
                light: "bg-rose-50",
                border: "border-rose-200",
                ring: "ring-rose-500",
                label: "專屬生日禮",
              };
            else if (
              kind.includes("ref") ||
              code.startsWith("ufamb-") ||
              code.startsWith("uffrd-")
            )
              theme = {
                bar: "bg-[#2a514d]",
                text: "text-[#2a514d]",
                light: "bg-[#eef4f3]",
                border: "border-emerald-200",
                ring: "ring-[#2a514d]",
                label: "購物抵用金",
              };

            return (
              <button
                key={c.code}
                type="button"
                onClick={() => onApply(c)}
                className={`relative w-full flex items-stretch rounded-xl border transition-all overflow-hidden text-left bg-white ${isActive ? `ring-2 ${theme.ring} border-transparent shadow-md scale-[0.98]` : "border-gray-200 hover:shadow-md hover:border-gray-300"}`}
              >
                <div className={`w-3 flex-shrink-0 ${theme.bar}`}></div>
                <div className="flex-1 min-w-0 p-3.5 py-4">
                  <div
                    className={`text-[11px] font-bold ${theme.text} mb-1 tracking-wider truncate`}
                  >
                    {theme.label}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-sm font-bold text-gray-900">NT$</span>
                    <span className="text-2xl font-black text-gray-900 tracking-tight truncate">
                      {amount}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono tracking-widest uppercase truncate w-full">
                    {c.code}
                  </div>
                </div>
                <div
                  className={`w-[76px] border-l-[1.5px] border-dashed ${theme.border} ${theme.light} flex flex-col items-center justify-center gap-1 shrink-0 px-2 py-3`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className={`w-5 h-5 ${theme.text}`} />
                      <span className={`text-[11px] font-black ${theme.text}`}>
                        已套用
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] font-bold text-gray-400 hover:text-gray-700 transition-colors text-center leading-tight">
                      點擊
                      <br />
                      使用
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {applied ? (
        <div className="mt-3 text-[11px] text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 flex justify-between items-center">
          <span>
            已套用：
            <span className="font-bold text-gray-900 uppercase">
              {applied.code}
            </span>
          </span>
          <span className="font-black text-[#2a514d]">
            - {currency(applied.amount)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function UpgradeBanner({ membership }) {
  if (!membership?.nextTierName || !membership?.nextNeedAmount) return null;
  return (
    <div className="bg-gradient-to-r from-[#fef9c3] to-[#fffbeb] border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6 flex items-start gap-3 shadow-sm">
      <Crown className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-600" />
      <div className="text-sm">
        <p className="font-bold">
          再消費{" "}
          <span className="text-red-600 font-black">
            {currency(membership.nextNeedAmount)}
          </span>{" "}
          即可升等為{" "}
          <span className="text-black font-black">
            {membership.nextTierName}
          </span>
          ！
        </p>
        <p className="text-xs mt-1 opacity-80">
          升等後將享有專屬折扣與更多禮遇。
        </p>
      </div>
    </div>
  );
}

function FreeShippingProgress({ needForFreeShip, freeShipThreshold }) {
  const percentage = Math.min(
    100,
    Math.max(
      0,
      ((freeShipThreshold - needForFreeShip) / freeShipThreshold) * 100,
    ),
  );
  const isFree = needForFreeShip === 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex justify-between items-end mb-2">
        <div className="text-sm font-bold text-gray-800">
          {isFree ? (
            <span className="text-[#2a514d] flex items-center gap-1">
              <CheckCircle2 size={16} /> 已達免運門檻！
            </span>
          ) : (
            <span>
              再消費{" "}
              <span className="text-rose-600 font-black">
                {currency(needForFreeShip)}
              </span>{" "}
              即可享全館免運
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          滿 {currency(freeShipThreshold)} 免運
        </div>
      </div>
      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${isFree ? "bg-[#2a514d]" : "bg-rose-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/* ── HOVER Checkout UI helpers ── */
const hoverInputCls =
  "w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none transition-colors focus:border-black disabled:cursor-not-allowed disabled:opacity-50";
const hoverSelectCls =
  "w-full cursor-pointer border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black outline-none transition-colors focus:border-black appearance-none";

function CheckoutSectionTitle({ children }) {
  return (
    <h2 className="mb-5 border-b border-black pb-2 text-[15px] font-bold text-black">
      {children}
    </h2>
  );
}

function HoverRadio({ checked, onChange, label, name }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-black">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[#2a514d]"
      />
      <span>{label}</span>
    </label>
  );
}

function HoverUnderlineInput({ error, className = "", ...props }) {
  return (
    <div>
      <input
        {...props}
        className={`${hoverInputCls} ${error ? "border-red-500" : ""} ${className}`}
      />
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function HoverSelect({ error, options = [], placeholder, value, onChange }) {
  return (
    <div>
      <select
        value={value}
        onChange={onChange}
        className={`${hoverSelectCls} ${error ? "border-red-500" : ""} ${!value ? "text-[#aaa]" : ""}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function getItemMeta(it) {
  const opts = it.options ? Object.values(it.options).filter(Boolean) : [];
  if (opts.length >= 2) return { color: opts[0], size: opts[1] };
  if (opts.length === 1) return { color: opts[0], size: "" };
  return { color: "", size: it.variant || "" };
}

// ✅ Cart Step 1 — HOVER redesign
function CartStep({
  items,
  onUpdateQty,
  onRemove,
  onNext,
  pricing,
  coupons,
  couponLoading,
  referralCoupons,
  referralLoading,
  appliedCoupon,
  onApplyCoupon,
  onClearCoupon,
  membership,
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-32 text-center">
        <p className="mb-8 text-[13px] tracking-[0.3em] text-[#555] uppercase">
          SHOPPING BAG
        </p>
        <ShoppingBag className="mb-6 h-14 w-14 text-[#bbb]" />
        <p className="mb-2 text-[16px] font-medium text-black">購物袋是空的</p>
        <a
          href="/products"
          className="mt-4 text-[13px] tracking-widest text-[#2a514d] underline underline-offset-4 hover:opacity-60"
        >
          繼續購物
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 md:px-8">
      {/* Title */}
      <p className="py-8 text-center text-[13px] tracking-[0.3em] text-[#555] uppercase">
        SHOPPING BAG
      </p>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px]">
        {/* ── Product list ────────────────────────────────── */}
        <div>
          {items.map((it, idx) => (
            <div
              key={it.id}
              className={`flex gap-5 py-6 ${idx === 0 ? "border-t" : ""} border-b border-[#d4d4d4]`}
            >
              {/* Image */}
              <div className="h-[148px] w-[106px] shrink-0 overflow-hidden bg-[#e8e6e2]">
                <img
                  src={it.image || it.img || "/images/hover/product-1.jpg"}
                  className="h-full w-full object-cover"
                  alt={it.name || it.title}
                />
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  {/* Name + meta */}
                  <div>
                    <p className="text-[13px] font-semibold uppercase leading-snug text-black">
                      {it.name || it.title}
                    </p>
                    {it.options
                      ? Object.entries(it.options).map(([, v]) =>
                          v ? (
                            <p key={v} className="mt-1 text-[12px] text-[#555]">
                              {v}
                            </p>
                          ) : null,
                        )
                      : null}
                    {/* Fallback color/size from id string */}
                    {!it.options && (
                      <>
                        {it.color && (
                          <p className="mt-1 text-[12px] text-[#555]">{it.color}</p>
                        )}
                        {it.size && (
                          <p className="text-[12px] text-[#555]">{it.size}</p>
                        )}
                      </>
                    )}
                    <p className="mt-2 text-[14px] font-bold text-black">
                      NT$ {Number(it.price).toLocaleString()}
                    </p>
                  </div>

                  {/* Wishlist + remove */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button type="button" aria-label="收藏" className="text-[#aaa] hover:text-black transition-colors">
                      <Heart className="h-[15px] w-[15px]" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      aria-label="移除"
                      onClick={() => onRemove(it.id || it.wcProductId)}
                      className="text-[#aaa] hover:text-black transition-colors"
                    >
                      <ChevronRight className="h-[15px] w-[15px] rotate-[-135deg]" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Qty + subtotal */}
                <div className="flex items-center justify-between">
                  <div className="flex h-8 items-center border border-[#ccc] bg-white">
                    <button
                      type="button"
                      className="flex h-full w-8 items-center justify-center text-black hover:bg-[#f0f0f0] transition-colors"
                      onClick={() => onUpdateQty(it.id || it.wcProductId, it.qty - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-[13px] font-medium">
                      {it.qty}
                    </span>
                    <button
                      type="button"
                      className="flex h-full w-8 items-center justify-center text-black hover:bg-[#f0f0f0] transition-colors"
                      onClick={() => onUpdateQty(it.id || it.wcProductId, it.qty + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[12px] text-[#555]">
                    小計 NT$ {(Number(it.price) * it.qty).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Order summary ────────────────────────────────── */}
        <aside className="lg:sticky lg:top-8 self-start">
          <div className="bg-white px-6 py-7">
            {/* Coupon (collapsible, shown if available) */}
            {([...coupons, ...referralCoupons]).length > 0 && (
              <div className="mb-6 border-b border-[#e8e8e8] pb-6">
                <CouponPicker
                  title="可用折價券"
                  subtitle="點擊即可套用折扣"
                  coupons={[...coupons, ...referralCoupons]}
                  applied={appliedCoupon}
                  onApply={onApplyCoupon}
                  onClear={onClearCoupon}
                  loading={couponLoading || referralLoading}
                />
              </div>
            )}

            {/* Pricing rows */}
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#555]">商品總金額</span>
                <span className="text-black">
                  NT$ {pricing.subtotal.toLocaleString()}
                </span>
              </div>

              {pricing.memberDiscountAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[#555]">{membership?.tierName} 折扣</span>
                  <span className="text-[#c90000]">
                    - NT$ {pricing.memberDiscountAmount.toLocaleString()}
                  </span>
                </div>
              )}

              {pricing.couponDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[#555]">折價券折抵</span>
                  <span className="text-[#c90000]">
                    - NT$ {pricing.couponDiscount.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[#555]">運費</span>
                <span className="text-black">
                  NT$ {pricing.shipping.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="my-4 border-t border-[#e8e8e8]" />

            {/* Total */}
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-black">總金額</span>
              <span className="text-[16px] font-bold text-black">
                NT$ {pricing.total.toLocaleString()}
              </span>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={onNext}
              className="flex h-[42px] w-full items-center justify-center bg-[#2a514d] text-[14px] tracking-widest text-white transition-colors hover:bg-[#1e3d3a] active:scale-[0.98]"
            >
              立即購買
            </button>

            {/* Free shipping hint */}
            {pricing.needForFreeShip > 0 && (
              <p className="mt-3 text-center text-[11px] text-[#888]">
                再消費 NT$ {pricing.needForFreeShip.toLocaleString()} 即可享免運費
              </p>
            )}
            {pricing.needForFreeShip === 0 && pricing.subtotal > 0 && (
              <p className="mt-3 text-center text-[11px] text-[#2a514d]">
                ✓ 已達免運門檻
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ✅ Cart Step 2 (Checkout)
function CheckoutStep({
  items,
  pricing,
  contact,
  setContact,
  addr,
  setAddr,
  shipMethod,
  setShipMethod,
  payMethod,
  setPayMethod,
  onPrev,
  onClearCart,
  coupons,
  couponLoading,
  referralCoupons,
  referralLoading,
  appliedCoupon,
  onApplyCoupon,
  onClearCoupon,
  membership,
  isLoggedIn, // 🌟 接收是否登入的狀態
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [invoiceType, setInvoiceType] = useState("cloud");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);

  const displayName = [addr.lastName, addr.firstName].filter(Boolean).join("").trim();
  const setDisplayName = (v) => setAddr({ ...addr, lastName: v, firstName: "" });

  const applyManualCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponApplying(true);
    try {
      const res = await fetch(
        `/api/checkout/validate-coupon?code=${encodeURIComponent(code)}`,
      );
      const data = await res.json();
      if (data.valid) {
        onApplyCoupon({
          code: data.code,
          amount: data.amount,
          kind: "",
          title: couponTitleByKindOrCode(data),
        });
      } else {
        alert(data.message || "折扣碼無效");
      }
    } catch {
      alert("折扣碼驗證失敗，請稍後再試");
    } finally {
      setCouponApplying(false);
    }
  };

  const activityDiscount =
    (pricing.memberDiscountAmount || 0) + (pricing.couponDiscount || 0);

  // 🚨 【護城河 1】：前往地圖前，強制手動儲存至 sessionStorage
  const saveStateBeforeMap = () => {
    sessionStorage.setItem("checkout_contact", JSON.stringify(contact));
    sessionStorage.setItem("checkout_addr", JSON.stringify(addr));
    sessionStorage.setItem("checkout_shipMethod", shipMethod);
    sessionStorage.setItem("checkout_payMethod", payMethod);
    sessionStorage.setItem("checkout_step", "2");
    sessionStorage.setItem("checkout_items", JSON.stringify(items));
  };

  const openEzShipMap = () => {
    saveStateBeforeMap();
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://map.ezship.com.tw/ezship_map_web.jsp";
    const params = {
      su_id: "uflow_service",
      processID: `UFLOW${Date.now()}`,
      rtURL: `${window.location.origin}/api/logistics/ezship-callback`,
    };
    Object.entries(params).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const openEcpay711Map = () => {
    saveStateBeforeMap();
    const merchantID = process.env.NEXT_PUBLIC_ECPAY_MERCHANT_ID;
    if (!merchantID) return alert("錯誤：讀取不到 ECPAY_MERCHANT_ID");
    const isTest = merchantID === "2000132" || merchantID === "2000933";
    const actionUrl = isTest
      ? "https://logistics-stage.ecpay.com.tw/Express/map"
      : "https://logistics.ecpay.com.tw/Express/map";
    const form = document.createElement("form");
    form.method = "POST";
    form.action = actionUrl;
    const params = {
      MerchantID: merchantID,
      LogisticsSubType: "UNIMARTC2C",
      MerchantTradeNo: `UFLOW${Date.now()}`,
      LogisticsType: "CVS",
      IsCollection: "N",
      ServerReplyURL: `${window.location.origin}/api/logistics/ecpay-callback`,
    };
    Object.entries(params).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const openStoreMap = () => {
    if (shipMethod === "711") openEcpay711Map();
    else if (shipMethod === "CVS") openEzShipMap();
  };

  const validate = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contact.email || !emailRegex.test(contact.email.trim()))
      e.email = "請輸入有效的電子郵件格式";

    if (!displayName) e.name = "請填寫姓名";

    const phoneRegex = /^09\d{8}$/;
    if (!addr.phone || !phoneRegex.test(addr.phone.trim())) {
      e.phone = "請輸入有效的台灣手機號碼 (09開頭共10碼)";
    }

    if (shipMethod === "000") {
      if (!addr.city) e.city = "請選擇縣市";
      if (!addr.district) e.district = "請選擇區域";
      if (!addr.street || !addr.street.trim())
        e.street = "請填寫街道門牌等詳細地址";
    } else {
      if (!addr.storeId) e.store = "請選擇配送門市";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIsSubmitting(true);

    const line1 =
      shipMethod === "000"
        ? `${addr.city}${addr.district}${addr.street.trim()}`
        : `${addr.storeName} (${addr.storeId}) - ${addr.storeAddr}`;

    const payload = {
      // 🚀 關鍵防護：確保 wcProductId 絕對有值
      items: items.map((it) => ({
        wcProductId: it.wcProductId || it.id,
        qty: it.qty,
        price: it.price,
        title: it.name || it.title,
      })),
      contact: { email: contact.email.trim() },
      addr: {
        firstName: addr.firstName.trim() || displayName,
        lastName: addr.lastName.trim() || displayName,
        line1: line1,
        phone: addr.phone.trim(),
        storeId: addr.storeId,
        storeName: addr.storeName,
        storeAddr: addr.storeAddr,
      },
      shipMethod,
      payMethod,
      coupon: appliedCoupon
        ? { code: appliedCoupon.code, amount: appliedCoupon.amount }
        : null,
      total: pricing.total,
      memberDiscount: pricing.memberDiscountAmount,
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.message || "建立訂單失敗");
        setIsSubmitting(false);
        return;
      }
      onClearCart();
      sessionStorage.removeItem("checkout_contact");
      sessionStorage.removeItem("checkout_addr");
      sessionStorage.removeItem("checkout_shipMethod");
      sessionStorage.removeItem("checkout_payMethod");
      sessionStorage.removeItem("checkout_step");
      sessionStorage.removeItem("checkout_items");

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      if (data.html) {
        const div = document.createElement("div");
        div.innerHTML = data.html;
        document.body.appendChild(div);
        document.getElementById("_form_ecpay")?.submit();
        return;
      }
      window.location.href = `/thank-you?orderId=${data.orderId}`;
    } catch (err) {
      setIsSubmitting(false);
      alert("連線失敗，請稍後再試");
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-8 md:px-8">
      <p className="mb-10 text-center text-[13px] tracking-[0.3em] text-[#555] uppercase">
        CHECKOUT
      </p>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        {/* ── Left: shipping & customer ── */}
        <div className="space-y-10">
          {/* 配送地區 */}
          <section>
            <CheckoutSectionTitle>配送地區</CheckoutSectionTitle>
            <HoverRadio
              name="region"
              checked
              onChange={() => {}}
              label="台灣本島"
            />
            <p className="mt-3 text-[11px] leading-[1.7] text-[#888]">
              目前僅提供台灣本島配送。離島（澎湖、金門、馬祖、綠島）請選擇超商取貨。
              全館消費滿 NT$1,500 享免運費。
            </p>
          </section>

          {/* 運送方式 */}
          <section>
            <CheckoutSectionTitle>運送方式</CheckoutSectionTitle>
            <div className="space-y-3">
              <HoverRadio
                name="ship"
                checked={shipMethod === "711"}
                onChange={() => {
                  setShipMethod("711");
                  setAddr({ ...addr, storeId: "", storeName: "", storeAddr: "" });
                }}
                label="7-11 超商取貨"
              />
              <HoverRadio
                name="ship"
                checked={shipMethod === "CVS"}
                onChange={() => {
                  setShipMethod("CVS");
                  setAddr({ ...addr, storeId: "", storeName: "", storeAddr: "" });
                }}
                label="全家 / 萊爾富 / OK 超商取貨"
              />
              <HoverRadio
                name="ship"
                checked={shipMethod === "000"}
                onChange={() => {
                  setShipMethod("000");
                  setAddr({ ...addr, storeId: "", storeName: "", storeAddr: "" });
                }}
                label={`宅配速送（新竹物流）${
                  pricing.discountedSubtotal >= pricing.freeShipThreshold
                    ? "— 免運"
                    : "— NT$105"
                }`}
              />
            </div>
          </section>

          {/* 訂購人資料 */}
          <section>
            <CheckoutSectionTitle>訂購人資料</CheckoutSectionTitle>
            <div className="space-y-5">
              <HoverUnderlineInput
                placeholder="姓名"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                error={errors.name}
                autoComplete="name"
              />
              <HoverUnderlineInput
                type="tel"
                inputMode="tel"
                placeholder="0912345678"
                maxLength={10}
                value={addr.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setAddr({ ...addr, phone: val });
                }}
                error={errors.phone}
                autoComplete="tel"
              />
              <HoverUnderlineInput
                type="email"
                inputMode="email"
                placeholder="service@hoverofficial.com"
                value={contact.email}
                onChange={(e) =>
                  setContact({ ...contact, email: e.target.value })
                }
                error={errors.email}
                readOnly={isLoggedIn}
                autoComplete="email"
              />

              {shipMethod === "000" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <HoverSelect
                      placeholder="縣市"
                      value={addr.city}
                      options={Object.keys(TW_CITIES)}
                      onChange={(e) => {
                        setAddr({
                          ...addr,
                          city: e.target.value,
                          district: "",
                        });
                      }}
                      error={errors.city}
                    />
                    <HoverSelect
                      placeholder="區域"
                      value={addr.district}
                      options={addr.city ? TW_CITIES[addr.city] : []}
                      onChange={(e) =>
                        setAddr({ ...addr, district: e.target.value })
                      }
                      error={errors.district}
                    />
                  </div>
                  <HoverUnderlineInput
                    placeholder="詳細地址（路名、門牌、樓層）"
                    value={addr.street}
                    onChange={(e) =>
                      setAddr({ ...addr, street: e.target.value })
                    }
                    error={errors.street}
                    autoComplete="street-address"
                  />
                </>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-4 border-b border-[#bbb] pb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-[#888]">收件地址</p>
                      <p className="mt-1 truncate text-[14px] text-black">
                        {addr.storeName
                          ? `${addr.storeName} — ${addr.storeAddr}`
                          : "請選擇取貨門市"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openStoreMap}
                      className="shrink-0 bg-[#2a514d] px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#1e3d3a]"
                    >
                      選擇門市
                    </button>
                  </div>
                  {errors.store && (
                    <p className="text-[11px] text-red-600">{errors.store}</p>
                  )}
                </>
              )}
            </div>
          </section>

          <button
            type="button"
            onClick={onPrev}
            className="flex items-center gap-1 text-[13px] text-[#888] transition-colors hover:text-black"
          >
            <ChevronLeft className="h-4 w-4" />
            返回購物車
          </button>
        </div>

        {/* ── Right: payment, invoice, summary ── */}
        <div className="space-y-10 lg:border-l lg:border-[#ccc] lg:pl-16">
          {/* 付款方式 */}
          <section>
            <CheckoutSectionTitle>付款方式</CheckoutSectionTitle>
            <div className="space-y-3">
              <HoverRadio
                name="pay"
                checked={payMethod === "card"}
                onChange={() => setPayMethod("card")}
                label="信用卡一次付清 (Credit Card)"
              />
              <HoverRadio
                name="pay"
                checked={payMethod === "linepay"}
                onChange={() => setPayMethod("linepay")}
                label="LINE Pay"
              />
            </div>
            <p className="mt-3 text-[11px] text-[#888]">
              選擇信用卡後，將跳轉至綠界安全金流頁面，亦可使用 ATM 虛擬轉帳或超商代碼。
            </p>
          </section>

          {/* 發票方式（UI 顯示，後端自動開立電子發票） */}
          <section>
            <CheckoutSectionTitle>發票方式</CheckoutSectionTitle>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {[
                { id: "cloud", label: "雲端電子發票" },
                { id: "carrier", label: "手機載具" },
                { id: "triple", label: "三聯式發票" },
                { id: "donate", label: "捐贈發票" },
              ].map((opt) => (
                <HoverRadio
                  key={opt.id}
                  name="invoice"
                  checked={invoiceType === opt.id}
                  onChange={() => setInvoiceType(opt.id)}
                  label={opt.label}
                />
              ))}
            </div>
          </section>

          {/* 商品資訊 */}
          <section>
            <CheckoutSectionTitle>商品資訊</CheckoutSectionTitle>
            <div className="space-y-4">
              {items.map((it) => {
                const { color, size } = getItemMeta(it);
                return (
                  <div
                    key={it.id}
                    className="flex items-baseline justify-between gap-4 border-b border-[#ddd] pb-3 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-black">
                        {it.name || it.title}
                      </span>
                      {color && (
                        <span className="ml-3 text-[#555]">{color}</span>
                      )}
                      {size && (
                        <span className="ml-3 text-[#555]">{size}</span>
                      )}
                      {it.qty > 1 && (
                        <span className="ml-2 text-[#888]">×{it.qty}</span>
                      )}
                    </div>
                    <span className="shrink-0 font-medium text-black">
                      {currency(it.price * it.qty)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 折扣碼 */}
            <div className="mt-6 flex items-end gap-3">
              <div className="flex-1">
                <HoverUnderlineInput
                  placeholder="輸入折扣碼"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyManualCoupon();
                    }
                  }}
                />
                {appliedCoupon && (
                  <p className="mt-1 text-[11px] text-[#2a514d]">
                    已套用：{appliedCoupon.code}（-
                    {currency(appliedCoupon.amount)}）
                    <button
                      type="button"
                      onClick={onClearCoupon}
                      className="ml-2 underline hover:opacity-70"
                    >
                      取消
                    </button>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={applyManualCoupon}
                disabled={couponApplying || !couponInput.trim()}
                className="shrink-0 bg-[#2a514d] px-5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#1e3d3a] disabled:opacity-50"
              >
                {couponApplying ? "..." : "完成"}
              </button>
            </div>

            {/* 錢包折價券 */}
            {(coupons.length > 0 || referralCoupons.length > 0) && (
              <div className="mt-4">
                {couponLoading || referralLoading ? (
                  <p className="text-[11px] text-[#888]">讀取錢包中…</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {[...coupons, ...referralCoupons].map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => onApplyCoupon(c)}
                        className={`border px-3 py-1 text-[11px] transition-colors ${
                          appliedCoupon?.code === c.code
                            ? "border-[#2a514d] bg-[#2a514d] text-white"
                            : "border-[#bbb] text-[#555] hover:border-[#2a514d]"
                        }`}
                      >
                        {c.title || c.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 金額明細 */}
          <div className="space-y-2 border-t border-black pt-6 text-[14px]">
            <div className="flex justify-between text-[#555]">
              <span>商品總金額</span>
              <span>{currency(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#555]">
              <span>活動折扣</span>
              <span>
                {activityDiscount > 0
                  ? `- ${currency(activityDiscount)}`
                  : currency(0)}
              </span>
            </div>
            <div className="flex justify-between text-[#555]">
              <span>運費</span>
              <span>
                {pricing.shipping === 0
                  ? currency(0)
                  : currency(pricing.shipping)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#ddd] pt-3 text-[15px] font-bold text-black">
              <span>總金額</span>
              <span>{currency(pricing.total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="w-full bg-[#2a514d] py-4 text-[14px] font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[#1e3d3a] disabled:opacity-50"
          >
            {isSubmitting
              ? payMethod === "linepay"
                ? "連線至 LINE Pay..."
                : "處理中..."
              : "完成訂購"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Main Cart Content
function CartContent() {
  const searchParams = useSearchParams();
  const storeItems = useCartStore((state) => state.items);
  const storeUpdateQty = useCartStore((state) => state.updateQty);
  const storeRemoveItem = useCartStore((state) => state.removeItem);
  const storeClearCart = useCartStore((state) => state.clearCart);

  const [items, setItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [step, setStep] = useState(1);
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCoupons, setReferralCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // 🌟 新增登入狀態
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [pricing, setPricing] = useState({
    subtotal: 0,
    memberDiscountAmount: 0,
    couponDiscount: 0,
    discountedSubtotal: 0,
    shipping: 0,
    total: 0,
    needForFreeShip: 1500,
    freeShipThreshold: 1500,
  });

  const [contact, setContact] = useState({ email: "" });
  const [addr, setAddr] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    district: "",
    street: "",
    storeId: "",
    storeName: "",
    storeAddr: "",
  });

  const [shipMethod, setShipMethod] = useState("000");
  const [payMethod, setPayMethod] = useState("card");
  const [membership, setMembership] = useState(null);
  const [discountRate, setDiscountRate] = useState(1);

  // 🚨 【護城河 2】：載入資料與 URL 判定完美融合
  useEffect(() => {
    // 優先處理跳轉回來的資料還原
    let _addr = { ...addr };
    let _contact = { ...contact };
    let _ship = "000";
    let _pay = "card";
    let _step = 1;
    let _items = [];

    try {
      const sAddr = sessionStorage.getItem("checkout_addr");
      if (sAddr) _addr = { ..._addr, ...JSON.parse(sAddr) };
      const sContact = sessionStorage.getItem("checkout_contact");
      if (sContact) _contact = { ..._contact, ...JSON.parse(sContact) };
      const sShip = sessionStorage.getItem("checkout_shipMethod");
      if (sShip) _ship = sShip;
      const sPay = sessionStorage.getItem("checkout_payMethod");
      if (sPay) _pay = sPay;
      const sStep = sessionStorage.getItem("checkout_step");
      if (sStep) _step = parseInt(sStep, 10);

      // ✅ 從 SessionStorage 撈回原本的商品清單
      const sItems = sessionStorage.getItem("checkout_items");
      if (sItems) {
        _items = JSON.parse(sItems);
      }
    } catch (e) {}

    // 如果 Zustand 有資料，就用 Zustand 的 (代表沒有刷新頁面)
    if (storeItems && storeItems.length > 0) {
      _items = storeItems;
    }

    // 檢查是否從地圖跳轉回來
    const sId = searchParams.get("storeId");
    const sName = searchParams.get("storeName");
    const sAddrUrl = searchParams.get("storeAddr");
    const prov = searchParams.get("provider");
    const urlStep = searchParams.get("step");

    if (sId && sName) {
      _ship = prov === "711" ? "711" : "CVS";
      _addr = {
        ..._addr,
        storeId: sId,
        storeName: sName,
        storeAddr: sAddrUrl || "",
      };
      _step = 2; // 強制進入第二步

      // 清理 URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("storeName");
      newUrl.searchParams.delete("storeId");
      newUrl.searchParams.delete("storeAddr");
      newUrl.searchParams.delete("provider");
      window.history.replaceState({}, "", newUrl.toString());
    } else if (urlStep) {
      _step = parseInt(urlStep, 10);
    }

    setContact(_contact);
    setAddr(_addr);
    setShipMethod(_ship);
    setPayMethod(_pay);
    setStep(_step);
    setItems(_items); // ✅ 設定被保留的商品清單

    const savedCoupon = sessionStorage.getItem("cart_coupon");
    if (savedCoupon) {
      try {
        const parsed = JSON.parse(savedCoupon);
        if (parsed?.code) setAppliedCoupon(parsed);
      } catch {}
    }

    setItemsLoaded(true);

    // 🌟 修正會員資料抓取，同步寫入 Email
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/account/profile");
        const data = await res.json();
        if (data.loggedIn) {
          setIsLoggedIn(true); // 標記為已登入

          if (data.customer?.email) {
            // 自動綁定信箱，並覆蓋掉任何從 sessionStorage 讀到的舊資料
            setContact((prev) => ({ ...prev, email: data.customer.email }));
          }

          if (data.membership) {
            setMembership(data.membership);
            setDiscountRate(TIER_DISCOUNTS[data.membership.tierName] || 1);
          }
        }
      } catch (e) {}
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🚨 當全域的 Zustand 真的有更新時（例如打開另一個分頁加了商品），才同步覆蓋本地
  useEffect(() => {
    if (itemsLoaded && storeItems && storeItems.length > 0) {
      setItems(storeItems);
    }
  }, [storeItems, itemsLoaded]);

  // 🚨 【護城河 3】：任何輸入狀態改變，立刻同步至 SessionStorage
  useEffect(() => {
    if (itemsLoaded) {
      sessionStorage.setItem("checkout_contact", JSON.stringify(contact));
      sessionStorage.setItem("checkout_addr", JSON.stringify(addr));
      sessionStorage.setItem("checkout_shipMethod", shipMethod);
      sessionStorage.setItem("checkout_payMethod", payMethod);
      sessionStorage.setItem("checkout_step", step.toString());
      sessionStorage.setItem("checkout_items", JSON.stringify(items)); // ✅ 商品變更也隨時存
    }
  }, [contact, addr, shipMethod, payMethod, step, items, itemsLoaded]);

  useEffect(() => {
    const loadAllCoupons = async () => {
      setCouponLoading(true);
      setReferralLoading(true);
      try {
        const res = await fetch("/api/account/coupons/available", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();
        const arr =
          res.ok && data?.ok && Array.isArray(data.available)
            ? data.available
            : [];
        const referral = [];
        const normal = [];
        arr.forEach((c) => {
          const code = String(c.code || "").toLowerCase();
          const kind = String(c.kind || "").toLowerCase();
          const item = {
            code: c.code,
            amount: Number(c.amount) || 0,
            kind: c.kind || "",
            title: couponTitleByKindOrCode(c),
          };
          if (
            code.startsWith("ufamb-") ||
            code.startsWith("uffrd-") ||
            kind === "ref_ambassador_200" ||
            kind === "ref_friend_50"
          ) {
            referral.push(item);
          } else {
            normal.push(item);
          }
        });
        setCoupons(normal);
        setReferralCoupons(referral);
        setAppliedCoupon((prev) => {
          if (!prev?.code) return null;
          const code = String(prev.code).toLowerCase();
          const isValid = [...normal, ...referral].some(
            (c) => String(c.code).toLowerCase() === code,
          );
          return isValid ? prev : null;
        });
      } catch (err) {
        setCoupons([]);
        setReferralCoupons([]);
      } finally {
        setCouponLoading(false);
        setReferralLoading(false);
      }
    };
    loadAllCoupons();
  }, []);

  useEffect(() => {
    if (!itemsLoaded) return;
    const discount = appliedCoupon?.amount || 0;
    // 🌟 修正運費判斷邏輯：宅配 105，超商 0
    const shippingBase = shipMethod === "000" ? 105 : 0;

    setPricing(
      calcPricing(
        items,
        { shippingBase, freeShipThreshold: 1500 },
        discount,
        discountRate,
      ),
    );
  }, [items, itemsLoaded, appliedCoupon, discountRate, shipMethod]);

  // ✅ 修正數量增減與移除，先更新 Local State，再更新 Store
  const updateQty = (id, newQty) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id || it.wcProductId === id ? { ...it, qty: newQty } : it,
      ),
    );
    if (typeof storeUpdateQty === "function") storeUpdateQty(id, newQty);
  };

  const removeItem = (id) => {
    setItems((prev) =>
      prev.filter((it) => it.id !== id && it.wcProductId !== id),
    );
    if (typeof storeRemoveItem === "function") storeRemoveItem(id);
  };

  const clearCart = () => {
    setItems([]);
    sessionStorage.removeItem("checkout_items");
    if (typeof storeClearCart === "function") storeClearCart();
  };

  const applyCoupon = (c) => {
    setAppliedCoupon(c);
    sessionStorage.setItem("cart_coupon", JSON.stringify(c));
  };
  const clearCoupon = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem("cart_coupon");
  };

  if (!itemsLoaded)
    return (
      <div className="flex h-[60vh] items-center justify-center bg-hover-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe0e5] border-t-[#2a514d]" />
      </div>
    );

  return (
    <div className="min-h-screen bg-hover-bg">
      <main>
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CartStep
                items={items}
                pricing={pricing}
                coupons={coupons}
                couponLoading={couponLoading}
                referralCoupons={referralCoupons}
                referralLoading={referralLoading}
                appliedCoupon={appliedCoupon}
                onApplyCoupon={applyCoupon}
                onClearCoupon={clearCoupon}
                onUpdateQty={updateQty}
                onRemove={removeItem}
                onNext={() => {
                  sessionStorage.setItem("checkout_step", "2");
                  setStep(2);
                }}
                membership={membership}
              />
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CheckoutStep
                items={items}
                pricing={pricing}
                coupons={coupons}
                couponLoading={couponLoading}
                referralCoupons={referralCoupons}
                referralLoading={referralLoading}
                appliedCoupon={appliedCoupon}
                onApplyCoupon={applyCoupon}
                onClearCoupon={clearCoupon}
                contact={contact}
                setContact={setContact}
                addr={addr}
                setAddr={setAddr}
                shipMethod={shipMethod}
                setShipMethod={setShipMethod}
                payMethod={payMethod}
                setPayMethod={setPayMethod}
                onPrev={() => {
                  sessionStorage.setItem("checkout_step", "1");
                  setStep(1);
                }}
                onClearCart={clearCart}
                membership={membership}
                isLoggedIn={isLoggedIn} // 🌟 傳遞登入狀態給 CheckoutStep
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-hover-bg">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe0e5] border-t-[#2a514d]" />
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}
