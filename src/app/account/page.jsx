// app/account/page.jsx
"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Fragment,
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

function OrderDetail({ order }) {
  const shippingSettings = useShippingSettings();
  const shipping = order.shipping || {};
  const billing = order.billing || {};
  const recipient =
    `${shipping.last_name || ""}${shipping.first_name || ""}`.trim() ||
    `${billing.last_name || ""}${billing.first_name || ""}`.trim() ||
    "—";
  const phone = shipping.phone || billing.phone || "—";
  const addressParts = [
    shipping.postcode || billing.postcode,
    shipping.state || billing.state,
    shipping.city || billing.city,
    shipping.address_1 || billing.address_1,
    shipping.address_2 || billing.address_2,
  ].filter(Boolean);
  const address = addressParts.join(" ") || "—";
  const shippingMethod =
    order.shipping_lines?.[0]?.method_title || "依訂單配送方式";
  const shippingTotal = Number(order.shipping_total || 0);

  return (
    <div className="bg-white text-[12px] text-[#333] md:text-[13px]">
      <div className="grid grid-cols-[minmax(0,1fr)_56px_86px] border-b border-[#d2d2d2] py-3 text-[#555] md:grid-cols-[minmax(0,1fr)_120px_160px]">
        <span>商品名稱</span>
        <span className="text-center">數量</span>
        <span className="text-right">小計</span>
      </div>

      {order.line_items?.map((item, index) => (
        <div
          key={`${order.id}-${item.name}-${index}`}
          className="grid grid-cols-[minmax(0,1fr)_56px_86px] items-center border-b border-[#d2d2d2] py-5 md:grid-cols-[minmax(0,1fr)_120px_160px]"
        >
          <div className="flex min-w-0 items-center gap-3 md:gap-5">
            <div className="relative h-[90px] w-[74px] shrink-0 overflow-hidden bg-white md:h-[112px] md:w-[92px]">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="92px"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#f5f5f3] text-[10px] text-[#aaa]">
                  HOVER
                </div>
              )}
            </div>
            <div className="min-w-0 leading-[1.8]">
              <p className="break-words font-medium text-black">{item.name}</p>
              {item.meta_data?.map((meta) => (
                <p key={`${meta.key}-${meta.value}`} className="text-[#555]">
                  {meta.value}
                </p>
              ))}
              <p className="mt-1 text-[#555]">
                {formatMoneyNT(Number(item.price || item.subtotal || item.total))}
              </p>
            </div>
          </div>
          <p className="text-center">{item.quantity}</p>
          <p className="text-right">{formatMoneyNT(Number(item.total))}</p>
        </div>
      ))}

      <div className="border-b border-[#d2d2d2] py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-4 py-2">
          <span>運費</span>
          <span className="text-right">
            {shippingTotal === 0
              ? `消費滿NT$${shippingSettings.freeShipThreshold.toLocaleString("zh-TW")}免運`
              : formatMoneyNT(shippingTotal)}
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-4 py-2 font-medium">
          <span>總金額</span>
          <span className="text-right">
            {formatMoneyNT(Number(order.total))}
          </span>
        </div>
      </div>

      <div className="space-y-2 px-1 py-7 leading-[1.8]">
        <p>收件人：{recipient} / {phone}</p>
        <p>配送地址：{address}</p>
        <p>配送方式：{shippingMethod}</p>
        <p>發票抬頭：電子發票</p>
        <p>備註：{order.customer_note || "—"}</p>
      </div>

      <a
        href={HOVER_LINE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 w-full items-center justify-center bg-[#2a514d] px-5 py-3 text-center text-[12px] tracking-[0.04em] text-white transition-opacity hover:opacity-85"
      >
        （如有問題請留言給客服）
      </a>
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

  const [expandedUserOrderId, setExpandedUserOrderId] = useState(null);

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
      const data = await res.json();
      setOrders(data.orders || []);
      setExpandedUserOrderId((prev) => prev ?? data.orders?.[0]?.id ?? null);
      setOrdersDebug(data.debug || null);
    } catch {
      setOrders([]);
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
        {(activeTab === "orders" || activeTab === "profile") && (
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

            {/* 訂單 Tab 內容 */}
            {activeTab === "orders" && (
              <div className="w-full">
                {ordersLoading ? (
                  <p className="py-12 text-center text-sm text-[#888]">
                    載入訂單中...
                  </p>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm text-[#888]">
                      {searchQuery
                        ? "找不到符合條件的訂單。"
                        : "目前尚未有任何訂單紀錄。"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full min-w-[680px] border-collapse text-left text-[12px] md:text-[13px]">
                      <thead>
                        <tr className="border-b border-[#ccc] text-center text-[#333]">
                          <th className="px-3 pb-3 font-normal">訂單編號</th>
                          <th className="px-3 pb-3 font-normal">日期</th>
                          <th className="px-3 pb-3 font-normal">狀態</th>
                          <th className="px-3 pb-3 font-normal">總金額</th>
                          <th className="px-3 pb-3 font-normal">付款方式</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((o) => {
                          const parsedMeta = parseMetaDataForPayment(
                            o.meta_data || [],
                          );
                          const noteInfo = extractInfoFromNote(
                            o.customer_note || "",
                          );
                          const cvsCode =
                            parsedMeta.cvs_code ||
                            o.payment_info?.cvs_code ||
                            noteInfo?.cvs_code;
                          const atmAccount =
                            parsedMeta.atm_account ||
                            o.payment_info?.atm_account ||
                            noteInfo?.atm_account;
                          const bankCode =
                            parsedMeta.bank_code ||
                            o.payment_info?.bank_code ||
                            noteInfo?.bank_code;
                          const barcode1 =
                            parsedMeta.barcode1 || o.payment_info?.barcode1;
                          const barcode2 =
                            parsedMeta.barcode2 || o.payment_info?.barcode2;
                          const barcode3 =
                            parsedMeta.barcode3 || o.payment_info?.barcode3;
                          const rawExpireDate =
                            parsedMeta.expire_date ||
                            o.payment_info?.expire_date ||
                            noteInfo?.expire_date ||
                            "依綠界規定";

                          const displayExpireDate =
                            rawExpireDate !== "依綠界規定" &&
                            /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(rawExpireDate)
                              ? `${rawExpireDate.replace(/-/g, "/")} 23:59:59`
                              : rawExpireDate;

                          const pTitle = o.payment_method_title || "標準支付";
                          const isPendingPayment =
                            o.status === "pending" ||
                            o.status === "待付款" ||
                            o.status === "waiting-payment" ||
                            o.status === "on-hold";

                          const statusLabel = (() => {
                            const s = String(o.status || "").toLowerCase();
                            if (s === "completed") return "已到貨";
                            if (s === "processing" || s === "paid") return "處理中";
                            if (s === "pending" || s === "on-hold" || s === "待付款")
                              return "待付款";
                            if (s === "cancelled") return "已取消";
                            return o.status;
                          })();

                          return (
                            <Fragment key={o.id}>
                              <tr
                                onClick={() =>
                                  setExpandedUserOrderId(
                                    expandedUserOrderId === o.id ? null : o.id,
                                  )
                                }
                                className="cursor-pointer border-b border-[#ccc] text-center transition-colors hover:bg-[#fafafa]"
                              >
                                <td className="px-3 py-4">
                                  <span className="text-[#2a514d] hover:underline">
                                    {o.number}
                                  </span>
                                </td>
                                <td className="px-3 py-4 text-[#333]">
                                  {new Date(o.date_created).toLocaleDateString(
                                    "zh-TW",
                                  )}
                                </td>
                                <td className="px-3 py-4">{statusLabel}</td>
                                <td className="px-3 py-4 font-medium">
                                  {formatMoneyNT(Number(o.total))}
                                </td>
                                <td className="px-3 py-4 text-[#333]">{pTitle}</td>
                              </tr>

                              {expandedUserOrderId === o.id && (
                                <tr className="bg-white">
                                  <td colSpan={5} className="px-0 py-0">
                                        <OrderDetail order={o} />
                                        <div
                                          className="grid md:grid-cols-2 gap-6 sm:gap-8"
                                          style={{ display: "none" }}
                                          aria-hidden
                                        >
                                          <div className="flex flex-col gap-3 sm:gap-4 w-full">
                                            <h4 className="font-bold text-[#202223] flex items-center gap-2">
                                              <CreditCard
                                                size={18}
                                                className="text-blue-600"
                                              />{" "}
                                              付款詳情
                                            </h4>
                                            {(() => {
                                              const isCancelled =
                                                o.status === "cancelled" ||
                                                o.status === "已取消";
                                              let isTimeExpired = false;
                                              if (
                                                rawExpireDate &&
                                                rawExpireDate !== "依綠界規定"
                                              ) {
                                                const dateStr =
                                                  rawExpireDate.replace(
                                                    /-/g,
                                                    "/",
                                                  );
                                                const hasTime =
                                                  dateStr.includes(":");
                                                const expDate = new Date(
                                                  dateStr,
                                                );
                                                if (
                                                  !hasTime &&
                                                  !isNaN(expDate.getTime())
                                                ) {
                                                  expDate.setHours(
                                                    23,
                                                    59,
                                                    59,
                                                    999,
                                                  );
                                                }
                                                if (!isNaN(expDate.getTime())) {
                                                  isTimeExpired =
                                                    new Date().getTime() >
                                                    expDate.getTime();
                                                }
                                              }

                                              if (isCancelled) {
                                                return (
                                                  <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-4 sm:p-5 shadow-sm text-center">
                                                    <p className="font-bold text-sm sm:text-base mb-1">
                                                      訂單已取消
                                                    </p>
                                                    <p className="text-[11px] sm:text-xs opacity-80">
                                                      若您仍需購買，請重新下單。
                                                    </p>
                                                  </div>
                                                );
                                              }

                                              if (isPendingPayment && cvsCode) {
                                                return (
                                                  <div
                                                    className={cn(
                                                      "rounded-lg p-4 sm:p-5 shadow-lg border relative overflow-hidden",
                                                      isTimeExpired
                                                        ? "bg-gray-100 border-gray-300 text-gray-500"
                                                        : "bg-emerald-600 border-emerald-700 text-white",
                                                    )}
                                                  >
                                                    {isTimeExpired && (
                                                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] z-10">
                                                        <div className="bg-rose-600 text-white px-4 py-2 rounded-full font-bold shadow-md transform -rotate-12 border-2 border-white">
                                                          繳費已逾期
                                                        </div>
                                                      </div>
                                                    )}
                                                    <p className="text-[11px] sm:text-xs opacity-80 mb-1">
                                                      超商繳費代碼 (CVS)
                                                    </p>
                                                    <div className="text-xl sm:text-2xl font-mono font-black tracking-widest flex items-center justify-between mb-4 bg-black/10 px-3 py-2 rounded w-full break-all">
                                                      {cvsCode}
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          navigator.clipboard.writeText(
                                                            cvsCode,
                                                          );
                                                          alert(
                                                            "已複製超商代碼",
                                                          );
                                                        }}
                                                        className="hover:scale-110 active:scale-95 transition-transform shrink-0 ml-2"
                                                        title="複製代碼"
                                                      >
                                                        <Copy size={20} />
                                                      </button>
                                                    </div>
                                                    <div className="text-[11px] sm:text-xs space-y-1 sm:space-y-1.5 opacity-90">
                                                      <p className="flex flex-wrap items-center justify-between gap-1">
                                                        <span>適用超商：</span>
                                                        <span className="font-medium text-right w-full sm:w-auto">
                                                          7-11, 全家, 萊爾富, OK
                                                        </span>
                                                      </p>
                                                      <p className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-current/20 mt-2">
                                                        <span className="flex items-center gap-1">
                                                          <Calendar size={14} />{" "}
                                                          繳費期限：
                                                        </span>
                                                        <span className="font-bold text-right w-full sm:w-auto">
                                                          {displayExpireDate}
                                                        </span>
                                                      </p>
                                                    </div>
                                                  </div>
                                                );
                                              }

                                              if (
                                                isPendingPayment &&
                                                atmAccount
                                              ) {
                                                return (
                                                  <div
                                                    className={cn(
                                                      "rounded-lg p-4 sm:p-5 shadow-lg border relative overflow-hidden",
                                                      isTimeExpired
                                                        ? "bg-gray-100 border-gray-300 text-gray-500"
                                                        : "bg-indigo-600 border-indigo-700 text-white",
                                                    )}
                                                  >
                                                    {isTimeExpired && (
                                                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] z-10">
                                                        <div className="bg-rose-600 text-white px-4 py-2 rounded-full font-bold shadow-md transform -rotate-12 border-2 border-white">
                                                          繳費已逾期
                                                        </div>
                                                      </div>
                                                    )}
                                                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-3 mb-4 w-full">
                                                      <div>
                                                        <p className="text-[11px] sm:text-xs opacity-80 mb-1">
                                                          銀行代碼
                                                        </p>
                                                        <div className="text-xl font-bold flex items-center gap-2">
                                                          <Landmark
                                                            size={20}
                                                            className="opacity-80"
                                                          />
                                                          {bankCode ||
                                                            "請見信件"}
                                                        </div>
                                                      </div>
                                                      <div className="w-full sm:w-auto sm:text-right border-t sm:border-t-0 border-white/20 pt-2 sm:pt-0">
                                                        <p className="text-[11px] sm:text-xs opacity-80 mb-0.5">
                                                          應付金額
                                                        </p>
                                                        <p className="text-lg sm:text-xl font-bold text-yellow-300">
                                                          {formatMoneyNT(
                                                            Number(o.total),
                                                          )}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <p className="text-[11px] sm:text-xs opacity-80 mb-1">
                                                      專屬虛擬帳號 (ATM)
                                                    </p>
                                                    <div className="text-lg sm:text-2xl font-mono font-black tracking-widest flex items-center justify-between bg-black/15 px-3 py-2.5 rounded-md mb-4 w-full break-all">
                                                      <span className="truncate pr-2">
                                                        {atmAccount}
                                                      </span>
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          navigator.clipboard.writeText(
                                                            atmAccount,
                                                          );
                                                          alert(
                                                            "已複製虛擬帳號",
                                                          );
                                                        }}
                                                        className="hover:scale-110 active:scale-95 transition-transform bg-white/20 p-2 rounded shrink-0"
                                                        title="複製帳號"
                                                      >
                                                        <Copy size={16} />
                                                      </button>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-current/20 text-[11px] sm:text-xs gap-1">
                                                      <span className="flex items-center gap-1 opacity-90">
                                                        <Calendar size={14} />{" "}
                                                        繳費期限：
                                                      </span>
                                                      <span className="font-bold sm:text-right">
                                                        {displayExpireDate}
                                                      </span>
                                                    </div>
                                                  </div>
                                                );
                                              }

                                              return (
                                                <div className="text-sm text-gray-600 bg-white border border-gray-200 p-4 rounded-md shadow-sm w-full">
                                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 pb-2 border-b border-gray-100 gap-1">
                                                    <span>付款方式：</span>
                                                    <span className="font-bold text-gray-900 break-words">
                                                      {pTitle}
                                                    </span>
                                                  </div>
                                                  {o.status === "processing" ||
                                                  o.status === "已完成" ||
                                                  o.status === "completed" ? (
                                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2.5 rounded mt-2">
                                                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                                                      <span className="font-bold text-[11px] sm:text-xs">
                                                        付款已成功，系統處理中
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <p className="text-[11px] sm:text-xs opacity-70 mt-2 leading-relaxed">
                                                      此訂單目前無須額外繳費代碼。
                                                      <br className="md:hidden" />
                                                      若有疑問請聯繫客服。
                                                    </p>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>

                                          <div className="flex flex-col gap-3 sm:gap-4 w-full mt-2 md:mt-0">
                                            <h4 className="font-bold text-[#202223] flex items-center gap-2">
                                              <Info
                                                size={18}
                                                className="text-gray-600"
                                              />{" "}
                                              訂單品項
                                            </h4>
                                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden w-full">
                                              {o.line_items.map((item, idx) => (
                                                <div
                                                  key={idx}
                                                  className="p-3 sm:px-4 sm:py-3 flex justify-between border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors gap-2"
                                                >
                                                  <div className="min-w-0 pr-2">
                                                    <p className="text-[13px] sm:text-sm font-bold text-gray-900 truncate">
                                                      {item.name}
                                                    </p>
                                                    <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                                                      數量: {item.quantity}
                                                    </p>
                                                  </div>
                                                  <p className="text-[13px] sm:text-sm font-mono font-medium text-gray-700 shrink-0 self-center">
                                                    {item.total
                                                      ? formatMoneyNT(
                                                          Number(item.total),
                                                        )
                                                      : ""}
                                                  </p>
                                                </div>
                                              ))}
                                              <div className="bg-gray-50 p-3 sm:px-4 sm:py-3 flex justify-between items-center border-t border-gray-200">
                                                <span className="font-bold text-gray-700 text-xs sm:text-sm">
                                                  訂單總計
                                                </span>
                                                <span className="text-base sm:text-lg font-black text-emerald-700">
                                                  {formatMoneyNT(
                                                    Number(o.total),
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
