// app/account/page.jsx
"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
} from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/lib/wishlistStore";
import { LineChart, BarChart } from "@mui/x-charts";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Users,
  Tag,
  BarChart2,
  Settings,
  Search,
  Bell,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Heart,
  ShoppingBag,
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

function getTierDisplay(tierName) {
  if (!tierName || tierName === "U銅貴賓") return "HOVER好友";
  return tierName;
}

function HoverUnderlineField({ label, value, type = "text" }) {
  return (
    <div className="pb-4">
      <input
        type={type}
        readOnly
        value={value || ""}
        placeholder={label}
        className="w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none cursor-default"
      />
    </div>
  );
}

function HoverSectionLabel({ children }) {
  return (
    <div className="mb-6 inline-block bg-[#2a514d] px-6 py-2.5 text-[13px] font-medium tracking-wide text-white">
      {children}
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
// 負責呈現後台訂單圖表的元件
// ============================================================================
function MemberAnalytics({ orders, customer }) {
  if (!orders || orders.length === 0)
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
        尚無足夠訂單資料可供分析。
      </div>
    );
  const totalAmount = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const orderCount = orders.length;
  const avgAmount = orderCount > 0 ? totalAmount / orderCount : 0;
  const monthLabels = [];
  const monthTotalsMap = {};
  orders.forEach((o) => {
    const d = new Date(o.date_created);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthLabels.includes(key)) monthLabels.push(key);
    monthTotalsMap[key] = (monthTotalsMap[key] || 0) + (o.total || 0);
  });
  monthLabels.sort();
  const monthTotals = monthLabels.map((m) => monthTotalsMap[m] || 0);
  const productMap = {};
  orders.forEach((o) =>
    o.line_items.forEach((it) => {
      productMap[it.name] = (productMap[it.name] || 0) + (it.quantity || 0);
    }),
  );
  const productEntries = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const productLabels = productEntries.map(([name]) => name);
  const productQty = productEntries.map(([, q]) => q);

  return (
    <div className="mt-4 space-y-3 w-full">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border bg-white px-3 py-2 shadow-sm">
          <div className="text-[11px] text-slate-500">訂單數</div>
          <div className="mt-1 text-lg font-semibold text-slate-800 break-all">
            {orderCount}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2 shadow-sm">
          <div className="text-[11px] text-slate-500">累計消費</div>
          <div className="mt-1 text-lg font-semibold text-slate-800 break-all">
            {formatNTD(totalAmount)}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2 shadow-sm">
          <div className="text-[11px] text-slate-500">平均客單價</div>
          <div className="mt-1 text-lg font-semibold text-slate-800 break-all">
            {orderCount === 0 ? "—" : formatNTD(avgAmount)}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2 shadow-sm">
          <div className="text-[11px] text-slate-500">推薦註冊</div>
          <div className="mt-1 text-lg font-semibold text-amber-700 break-all">
            {customer.referredCount || 0}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2 shadow-sm">
          <div className="text-[11px] text-slate-500">成功首單</div>
          <div className="mt-1 text-lg font-semibold text-amber-700 break-all">
            {customer.rewardedCount || 0}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2 shadow-sm">
          <div className="text-[11px] text-slate-500">已賺推薦金</div>
          <div className="mt-1 text-lg font-semibold text-amber-700 break-all">
            {formatNTD(customer.referralEarned || 0)}
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-white px-3 py-2 shadow-sm overflow-hidden w-full">
          <div className="mb-1 text-[11px] font-semibold text-slate-600">
            每月消費趨勢
          </div>
          {monthLabels.length === 0 ? (
            <p className="text-xs text-slate-400">尚無資料。</p>
          ) : (
            <div className="h-48 sm:h-52 w-full">
              <LineChart
                xAxis={[
                  { scaleType: "point", data: monthLabels, label: "月份" },
                ]}
                series={[
                  {
                    data: monthTotals,
                    label: "消費金額",
                    valueFormatter: (v) => formatNTD(Number(v)),
                  },
                ]}
                margin={{ left: 40, right: 10, top: 20, bottom: 30 }}
              />
            </div>
          )}
        </div>
        <div className="rounded-lg border bg-white px-3 py-2 shadow-sm overflow-hidden w-full">
          <div className="mb-1 text-[11px] font-semibold text-slate-600">
            最常購買商品 TOP 5
          </div>
          {productLabels.length === 0 ? (
            <p className="text-xs text-slate-400">尚無資料。</p>
          ) : (
            <div className="h-48 sm:h-52 w-full">
              <BarChart
                layout="horizontal"
                xAxis={[{ label: "數量" }]}
                yAxis={[{ scaleType: "band", data: productLabels }]}
                series={[{ data: productQty, label: "數量", color: "#008060" }]}
                margin={{ left: 80, right: 10, top: 20, bottom: 30 }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
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
    upgrade: false,
    birthday: false,
  });
  const [claimed, setClaimed] = useState({ upgrade: false, birthday: false });
  const [claimMessage, setClaimMessage] = useState(null);
  const [claimStatus, setClaimStatus] = useState(null);
  const [claimedCode, setClaimedCode] = useState(null);
  const [showAllReferralCoupons, setShowAllReferralCoupons] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [expandedUserOrderId, setExpandedUserOrderId] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState([]);
  const [expandedOrdersLoading, setExpandedOrdersLoading] = useState(false);
  const [expandedOrdersError, setExpandedOrdersError] = useState("");
  const adminLoadedOnceRef = useRef(false);

  const [birthdayInput, setBirthdayInput] = useState("");
  const [isSettingBirthday, setIsSettingBirthday] = useState(false);
  const [birthdayLoading, setBirthdayLoading] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [modalBirthdayInput, setModalBirthdayInput] = useState("");

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
        setLoggedIn(true);
        setCustomer(data.customer || {});
        setMembership(data.membership || null);
        const roles = Array.isArray(data?.customer?.roles)
          ? data.customer.roles
          : [];
        const role = String(data?.customer?.role || "");
        const adminFlag =
          Boolean(data?.customer?.isAdmin) ||
          Boolean(data?.isAdmin) ||
          roles.includes("administrator") ||
          roles.includes("admin") ||
          roles.includes("網站管理員") ||
          role === "administrator" ||
          role === "admin" ||
          role === "網站管理員";
        setIsAdmin(adminFlag);
      } else {
        setLoggedIn(false);
        setCustomer(null);
        setMembership(null);
        setIsAdmin(false);
      }
    } catch {
      setError("讀取會員資料失敗，請稍後再試。");
      setLoggedIn(false);
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
    if (tab && ["profile", "orders", "favorites", "admin"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      loadOrders();
      loadReferral();
      loadAvailableCoupons();
    }
  }, [loggedIn, loadOrders, loadReferral, loadAvailableCoupons]);

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

  const displayName =
    (
      (customer?.first_name || "") +
      (customer?.last_name ? ` ${customer?.last_name}` : "")
    ).trim() ||
    customer?.username ||
    (customer?.email ? customer.email.split("@")[0] : "會員");
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

  const loadAdminCustomers = useCallback(async () => {
    setAdminLoading(true);
    setAdminError("");
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const js = await res.json();
      if (!res.ok || !js.ok) {
        setAdminData([]);
        setAdminError(
          `伺服器拒絕 (${res.status}): ${js?.message || "請檢查後端 API 的權限設定"}`,
        );
        return;
      }
      setAdminData(js.customers || []);
      adminLoadedOnceRef.current = true;
    } catch (e) {
      setAdminError(e?.message || "讀取會員名單時發生錯誤");
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const toggleExpandAdminRow = async (customerId, email) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      setExpandedOrders([]);
      setExpandedOrdersError("");
      return;
    }
    setExpandedId(customerId);
    setExpandedOrders([]);
    setExpandedOrdersError("");
    setExpandedOrdersLoading(true);
    try {
      const qs = new URLSearchParams({ customerId: String(customerId) });
      if (email) qs.set("email", email);
      const res = await fetch(`/api/admin/customer-orders?${qs.toString()}`, {
        cache: "no-store",
      });
      const js = await res.json();
      if (!res.ok || !js.ok)
        throw new Error(`(${res.status}) ${js?.message || "讀取訂單失敗"}`);
      setExpandedOrders(js.orders || []);
    } catch (e) {
      setExpandedOrders([]);
      setExpandedOrdersError(e?.message || "讀取訂單失敗");
    } finally {
      setExpandedOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (
      !loggedIn ||
      !isAdmin ||
      activeTab !== "admin" ||
      adminLoadedOnceRef.current
    )
      return;
    loadAdminCustomers();
  }, [activeTab, isAdmin, loggedIn, loadAdminCustomers]);

  const adminFiltered = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword || activeTab !== "admin") return adminData;
    return adminData.filter(
      (c) =>
        c.name.toLowerCase().includes(keyword) ||
        c.email.toLowerCase().includes(keyword) ||
        (c.username || "").toLowerCase().includes(keyword),
    );
  }, [searchQuery, adminData, activeTab]);

  const totalMembers = adminData.length;
  const totalRevenue = adminData.reduce((s, c) => s + c.totalSpent, 0);
  const totalReferred = adminData.reduce(
    (s, c) => s + (c.referredCount || 0),
    0,
  );
  const totalReferralEarned = adminData.reduce(
    (s, c) => s + (c.referralEarned || 0),
    0,
  );

  const renderExpandedOrdersAdmin = () => {
    if (expandedOrdersLoading)
      return (
        <p className="text-xs text-slate-500 py-4 text-center">載入訂單中…</p>
      );
    if (expandedOrdersError)
      return (
        <p className="text-xs text-rose-600 py-4 text-center">
          {expandedOrdersError}
        </p>
      );
    if (expandedOrders.length === 0)
      return (
        <p className="text-xs text-slate-500 py-4 text-center">
          目前尚無任何訂單。
        </p>
      );

    return (
      <div className="mt-2 rounded-lg border bg-slate-50 overflow-x-auto">
        <table className="min-w-[600px] w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">訂單編號</th>
              <th className="px-3 py-2 font-semibold">日期</th>
              <th className="px-3 py-2 font-semibold">狀態</th>
              <th className="px-3 py-2 font-semibold">付款資訊</th>
              <th className="px-3 py-2 text-right font-semibold">金額</th>
              <th className="px-3 py-2 font-semibold w-1/4">品項</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {expandedOrders.map((o) => {
              const parsedMeta = parseMetaDataForPayment(o.meta_data || []);
              const noteInfo = extractInfoFromNote(o.customer_note || "");
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

              return (
                <tr key={o.id} className="hover:bg-gray-100 transition-colors">
                  <td className="px-3 py-3 align-top font-medium text-slate-700 whitespace-nowrap">
                    #{o.number}
                  </td>
                  <td className="px-3 py-3 align-top text-slate-500 whitespace-nowrap">
                    {new Date(o.date_created).toLocaleDateString("zh-TW")}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusPill status={o.status} type="order" />
                  </td>
                  <td className="px-3 py-3 align-top max-w-[150px]">
                    <div
                      className="font-semibold text-slate-700 truncate"
                      title={pTitle}
                    >
                      {pTitle}
                    </div>
                    {atmAccount && (
                      <div className="mt-1 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block">
                        ATM: {bankCode} - {atmAccount}
                      </div>
                    )}
                    {cvsCode && (
                      <div className="mt-1 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block">
                        CVS: {cvsCode}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-right font-semibold whitespace-nowrap">
                    {formatNTD(o.total)}
                  </td>
                  <td className="px-3 py-3 align-top min-w-[150px]">
                    <div className="flex flex-col gap-1">
                      {o.line_items.slice(0, 2).map((it, idx) => (
                        <span
                          key={idx}
                          className="text-slate-600 truncate text-[11px]"
                          title={it.name}
                        >
                          {it.name}{" "}
                          <span className="text-slate-400">×{it.quantity}</span>
                        </span>
                      ))}
                      {o.line_items.length > 2 && (
                        <span className="text-slate-400 text-[10px]">
                          ...等 {o.line_items.length} 項
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

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
    if (activeTab === "admin") return "搜尋會員...";
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
              {wishlistItems.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2a514d] px-1 text-[9px] font-bold text-white">
                  {wishlistItems.length}
                </span>
              )}
            </AccountTabButton>
            {isAdmin && (
              <AccountTabButton
                active={activeTab === "admin"}
                onClick={() => switchTab("admin")}
              >
                會員管理
              </AccountTabButton>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.replace("/login?next=/account");
            }}
            className="mb-3 flex shrink-0 items-center gap-1.5 text-[13px] text-[#c0392b] transition-opacity hover:opacity-70"
          >
            <LogOut size={15} strokeWidth={1.5} />
            登出
          </button>
        </div>

        {/* Mobile search */}
        {(activeTab === "orders" || activeTab === "profile" || activeTab === "admin") && (
          <div className="relative mb-6 md:hidden">
            <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" />
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
                      {getTierDisplay(membership?.tierName)}
                    </div>
                    <p className="text-[13px] leading-relaxed text-[#555]">
                      {membership?.nextNeedAmount != null && membership?.nextTierName
                        ? `再消費滿 ${formatMoneyNT(membership.nextNeedAmount).replace("NT$ ", "NT$")} 即可升級成${membership.nextTierName}`
                        : "您已達最高會員等級"}
                    </p>
                    <Link
                      href="/brand"
                      className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#555] underline-offset-2 hover:underline"
                    >
                      查看會員優惠資訊 ▶
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
                    <HoverSectionLabel>會員資料修改</HoverSectionLabel>
                    <HoverUnderlineField label="姓名" value={displayName} />
                    <HoverUnderlineField
                      label="電話"
                      value={customer?.phone || customer?.billing_phone || "—"}
                    />
                    <HoverUnderlineField
                      label="Email"
                      value={customer?.email || "—"}
                    />
                    <HoverUnderlineField
                      label="生日"
                      value={customer?.birthday || "未設定"}
                      type={customer?.birthday ? "date" : "text"}
                    />
                    <HoverUnderlineField
                      label="地址"
                      value={customer?.billing_address || customer?.address || "—"}
                    />
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
                    <HoverSectionLabel>密碼修改</HoverSectionLabel>
                    <div className="space-y-0">
                      <div className="pb-4">
                        <input
                          type="password"
                          placeholder="請輸入舊密碼"
                          disabled
                          className="w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                      <div className="pb-4">
                        <input
                          type="password"
                          placeholder="新密碼"
                          disabled
                          className="w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                      <div className="pb-4">
                        <input
                          type="password"
                          placeholder="請再輸入一次新密碼"
                          disabled
                          className="w-full border-0 border-b border-[#bbb] bg-transparent pb-2 pt-1 text-[14px] text-black placeholder-[#aaa] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </div>
                    <Link
                      href="/forgot-password"
                      className="mt-4 inline-block text-[13px] text-[#2a514d] underline underline-offset-2 hover:opacity-70"
                    >
                      忘記密碼？前往重設
                    </Link>
                  </div>
                </div>

                {/* 推薦計畫 & 優惠券 — 保留原有功能 */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <ShellCard
                      title="推薦計畫"
                      right={<StatusPill status="金牌大使推薦" type="tier" />}
                    >
                      {referralLoading ? (
                        <p className="text-sm text-[#6d7175]">
                          讀取推薦資訊中...
                        </p>
                      ) : !referral ? (
                        <p className="text-sm text-[#6d7175]">尚無推薦資訊</p>
                      ) : (
                        <div className="space-y-4 sm:space-y-5">
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 sm:p-4 text-sm text-emerald-900 leading-relaxed">
                            親友註冊可得{" "}
                            <strong className="text-emerald-700">
                              NT$ {referral.friendReward}
                            </strong>{" "}
                            購物金，親友首單完成後你可得{" "}
                            <strong className="text-emerald-700">
                              NT$ {referral.ambassadorReward}
                            </strong>{" "}
                            抵用金。
                          </div>
                          {/* 💡 推薦碼輸入框加入 min-w-0 與 break-all 防破版 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="w-full min-w-0">
                              <p className="text-xs text-[#6d7175] mb-1">
                                您的推薦碼
                              </p>
                              <div className="flex items-center justify-between border border-[#c9cccf] rounded-md px-3 py-2 bg-[#f9fafb] w-full">
                                <code className="text-sm font-mono font-bold text-[#008060] break-all truncate mr-2">
                                  {referral.refCode}
                                </code>
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      referral.refCode,
                                    )
                                  }
                                  className="text-[#5c5f62] hover:text-[#008060] transition-colors shrink-0"
                                >
                                  <Copy size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="w-full min-w-0">
                              <p className="text-xs text-[#6d7175] mb-1">
                                推薦連結
                              </p>
                              <div className="flex items-center gap-2 w-full">
                                <input
                                  readOnly
                                  value={referral.referralLink}
                                  className="flex-1 min-w-0 border border-[#c9cccf] rounded-md px-3 py-2 text-sm bg-[#f9fafb] outline-none font-mono text-xs"
                                />
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      referral.referralLink,
                                    )
                                  }
                                  className="bg-white border border-[#c9cccf] shadow-sm text-[#202223] px-3 py-2 rounded-md hover:bg-[#f6f6f7] transition-colors font-medium text-sm shrink-0"
                                >
                                  複製
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </ShellCard>
                  </div>

                  <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-5 w-full">
                    <ShellCard title="狀態與詳情">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center border-b border-[#ebebeb] pb-3">
                          <span className="text-[#6d7175] text-sm">
                            帳戶狀態
                          </span>
                          <StatusPill status="正常運作" type="account" />
                        </div>
                        <div className="flex justify-between items-center border-b border-[#ebebeb] pb-3">
                          <span className="text-[#6d7175] text-sm">
                            折扣優惠
                          </span>
                          <span className="font-bold text-emerald-600 text-sm">
                            {membership?.discountLabel || "—"}
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-[#6d7175] text-sm block mb-2">
                            生日
                          </span>
                          {!customer?.birthday ? (
                            !isSettingBirthday ? (
                              <button
                                onClick={() => setIsSettingBirthday(true)}
                                className="w-full border border-dashed border-[#c9cccf] bg-[#f9fafb] hover:bg-white text-[#202223] py-2 rounded-md text-sm font-medium transition-colors"
                              >
                                設定生日
                              </button>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="date"
                                  value={birthdayInput}
                                  onChange={(e) =>
                                    setBirthdayInput(e.target.value)
                                  }
                                  className="w-full border border-[#c9cccf] rounded-md px-3 py-2 text-sm outline-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleUpdateBirthday}
                                    disabled={birthdayLoading}
                                    className="flex-1 bg-[#008060] text-white text-sm py-2 rounded-md hover:bg-[#006e52]"
                                  >
                                    {birthdayLoading ? "..." : "儲存"}
                                  </button>
                                  <button
                                    onClick={() => setIsSettingBirthday(false)}
                                    className="flex-1 bg-white border border-[#c9cccf] text-[#202223] text-sm py-2 rounded-md hover:bg-[#f6f6f7]"
                                  >
                                    取消
                                  </button>
                                </div>
                                <p className="text-[10px] text-rose-500 italic mt-1">
                                  * 生日填寫後將無法修改
                                </p>
                              </div>
                            )
                          ) : (
                            <div className="font-bold text-[#202223] text-sm bg-gray-50 px-3 py-2 rounded border border-gray-100 flex items-center gap-2">
                              <span className="text-rose-400">🎂</span>{" "}
                              {customer.birthday}
                            </div>
                          )}
                        </div>
                      </div>
                    </ShellCard>

                    <ShellCard title="獎勵與優惠券">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-[#ebebeb] pb-3">
                          <div>
                            <p className="text-sm font-medium text-[#202223]">
                              {membership?.tierName === "U銅貴賓"
                                ? "註冊 / 升等禮"
                                : "專屬升等禮"}
                            </p>
                            <p className="text-xs font-bold text-amber-600 mt-0.5">
                              {membership?.upgradeGift ?? 0} 元
                            </p>
                          </div>
                          {membership?.upgradeGift ? (
                            <button
                              onClick={() => handleClaim("upgrade")}
                              disabled={claimLoading.upgrade || claimed.upgrade}
                              className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-bold transition-all border shadow-sm",
                                claimed.upgrade
                                  ? "bg-gray-100 text-gray-400 border-gray-200"
                                  : "bg-white text-[#202223] border-[#c9cccf] hover:bg-[#f6f6f7]",
                              )}
                            >
                              {claimed.upgrade ? "已領取" : "領取禮物"}
                            </button>
                          ) : (
                            <span className="text-xs text-[#6d7175]">—</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-b border-[#ebebeb] pb-3">
                          <div>
                            <p className="text-sm font-medium text-[#202223]">
                              生日禮
                            </p>
                            <p className="text-xs font-bold text-rose-600 mt-0.5">
                              {membership?.birthdayCredit ?? 0} 元
                            </p>
                          </div>
                          {customer?.birthday && membership?.birthdayCredit ? (
                            isCurrentMonthBirthday ? (
                              <button
                                onClick={() => handleClaim("birthday")}
                                disabled={
                                  claimLoading.birthday || claimed.birthday
                                }
                                className={cn(
                                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all border shadow-sm",
                                  claimed.birthday
                                    ? "bg-gray-100 text-gray-400 border-gray-200"
                                    : "bg-white text-[#202223] border-[#c9cccf] hover:bg-[#f6f6f7]",
                                )}
                              >
                                {claimed.birthday ? "已領取" : "領取好禮"}
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
                              折扣碼錢包 (已領取)
                            </span>
                            <button
                              onClick={loadAvailableCoupons}
                              className="text-xs text-[#2c6ecb] hover:underline"
                            >
                              刷新清單
                            </button>
                          </div>
                          {availableLoading ? (
                            <p className="text-xs text-[#6d7175] py-2">
                              讀取中...
                            </p>
                          ) : filteredCoupons.length === 0 ? (
                            <p className="text-xs text-[#6d7175] bg-[#f9fafb] p-3 rounded-md border border-[#e1e3e5] text-center leading-relaxed">
                              錢包內目前沒有折扣碼。
                              <br />
                              請先至上方領取，或參加活動獲取！
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2.5 w-full">
                              {filteredCoupons.map((c) => (
                                <div
                                  key={c.code}
                                  className="border border-[#c9cccf] rounded-md p-3 flex justify-between items-center bg-[#f9fafb] hover:shadow-sm w-full"
                                >
                                  <div className="min-w-0 pr-2">
                                    <span className="font-bold text-rose-600 text-sm block truncate w-full">
                                      {formatMoneyNT(c.amount)}
                                    </span>
                                    <p className="text-[11px] text-[#6d7175] mt-1 font-medium truncate w-full">
                                      {c.kind === "upgrade"
                                        ? "升等禮金"
                                        : c.kind === "birthday"
                                          ? "生日禮金"
                                          : isAmbassadorCoupon(c.code, c.kind)
                                            ? "推薦大使獎勵"
                                            : isFriendCoupon(c.code, c.kind)
                                              ? "新會員首購獎勵"
                                              : "專屬折扣碼"}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      navigator.clipboard.writeText(c.code)
                                    }
                                    className="text-[#5c5f62] hover:text-[#008060] bg-white border border-[#c9cccf] p-2 rounded shadow-sm shrink-0"
                                  >
                                    <Copy size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </ShellCard>
                  </div>
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
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-[#ccc] text-[#888]">
                          <th className="pb-3 pr-4 font-normal">訂單編號</th>
                          <th className="pb-3 pr-4 font-normal">日期</th>
                          <th className="pb-3 pr-4 font-normal">狀態</th>
                          <th className="pb-3 pr-4 font-normal">總金額</th>
                          <th className="pb-3 font-normal">付款方式</th>
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
                            if (s === "completed" || s === "processing" || s === "paid")
                              return "已出貨";
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
                                className="cursor-pointer border-b border-[#e8e8e8] transition-colors hover:bg-white/60"
                              >
                                <td className="py-4 pr-4">
                                  <span className="text-[#4a90d9] hover:underline">
                                    {o.number}
                                  </span>
                                </td>
                                <td className="py-4 pr-4 text-[#555]">
                                  {new Date(o.date_created).toLocaleDateString(
                                    "zh-TW",
                                  )}
                                </td>
                                <td className="py-4 pr-4">{statusLabel}</td>
                                <td className="py-4 pr-4 font-medium">
                                  {formatMoneyNT(Number(o.total))}
                                </td>
                                <td className="py-4 text-[#555]">{pTitle}</td>
                              </tr>

                              {expandedUserOrderId === o.id && (
                                <tr className="bg-white/50">
                                  <td colSpan={5} className="px-0 py-5">
                                        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
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

            {/* Admin Tab 內容 */}
            {activeTab === "admin" && (
              <div className="w-full">
                {!isAdmin && (
                  <ShellCard title="權限不足">
                    <p className="text-xs sm:text-sm text-rose-600 bg-rose-50 p-3 sm:p-4 rounded-md border border-rose-200 break-words">
                      權限不足或是後端尚未開放，目前僅可瀏覽這段錯誤訊息。
                      <br />
                      請檢查 <code>/api/admin/customers</code> 權限。
                    </p>
                  </ShellCard>
                )}

                {isAdmin && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 w-full">
                      <div className="bg-white border border-[#c9cccf] rounded-lg p-4 sm:p-5 shadow-sm flex flex-col gap-1 w-full">
                        <span className="text-[10px] sm:text-xs text-[#6d7175] font-medium uppercase tracking-wider">
                          總會員數
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-[#202223] break-all">
                          {totalMembers}
                        </span>
                      </div>
                      <div className="bg-white border border-[#c9cccf] rounded-lg p-4 sm:p-5 shadow-sm flex flex-col gap-1 w-full">
                        <span className="text-[10px] sm:text-xs text-[#6d7175] font-medium uppercase tracking-wider">
                          累計總營收
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-[#202223] break-all">
                          {formatNTD(totalRevenue)}
                        </span>
                      </div>
                      <div className="bg-white border border-[#c9cccf] rounded-lg p-4 sm:p-5 shadow-sm flex flex-col gap-1 w-full">
                        <span className="text-[10px] sm:text-xs text-[#6d7175] font-medium uppercase tracking-wider">
                          全站推薦註冊
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-amber-700 break-all">
                          {totalReferred}
                        </span>
                      </div>
                      <div className="bg-white border border-[#c9cccf] rounded-lg p-4 sm:p-5 shadow-sm flex flex-col gap-1 w-full">
                        <span className="text-[10px] sm:text-xs text-[#6d7175] font-medium uppercase tracking-wider">
                          全站推薦金支出
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-amber-700 break-all">
                          {formatNTD(totalReferralEarned)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-[#c9cccf] rounded-lg shadow-sm overflow-hidden w-full">
                      <div className="px-4 sm:px-5 py-4 border-b border-[#c9cccf] flex items-center justify-between bg-[#f9fafb]">
                        <h2 className="text-sm sm:text-base font-semibold text-[#202223]">
                          會員列表與詳細分析
                        </h2>
                        <span className="text-[10px] sm:text-xs font-medium text-[#6d7175] bg-[#e4e5e7] px-2 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap">
                          顯示 {adminFiltered.length} / {adminData.length} 筆
                        </span>
                      </div>

                      <div className="p-3 sm:p-5 w-full">
                        {adminLoading && (
                          <p className="text-xs sm:text-sm text-[#6d7175] py-4 text-center">
                            載入中...
                          </p>
                        )}
                        {!adminLoading && adminError && (
                          <p className="text-xs sm:text-sm text-rose-600 bg-rose-50 p-4 rounded-md border border-rose-200 shadow-sm break-words">
                            <strong>錯誤</strong>：{adminError}
                          </p>
                        )}
                        {!adminLoading &&
                          !adminError &&
                          adminFiltered.length === 0 && (
                            <p className="text-xs sm:text-sm text-[#6d7175] py-6 text-center border border-dashed border-[#c9cccf] rounded bg-[#f9fafb]">
                              找不到符合條件的會員。
                            </p>
                          )}

                        {!adminLoading &&
                          !adminError &&
                          adminFiltered.length > 0 && (
                            <div className="overflow-x-auto rounded-lg border border-[#c9cccf] w-full">
                              <table className="min-w-[800px] w-full text-xs sm:text-sm text-left">
                                <thead className="bg-[#F58A9C] text-[10px] sm:text-xs uppercase text-slate-50 border-b border-[#c9cccf]">
                                  <tr>
                                    <th className="px-4 py-3 sm:py-4 font-semibold">
                                      會員
                                    </th>
                                    <th className="px-4 py-3 sm:py-4 font-semibold">
                                      Email
                                    </th>
                                    <th className="px-4 py-3 sm:py-4 font-semibold">
                                      城市
                                    </th>
                                    <th className="px-4 py-3 sm:py-4 font-semibold text-right">
                                      訂單數
                                    </th>
                                    <th className="px-4 py-3 sm:py-4 font-semibold text-right">
                                      累計消費
                                    </th>
                                    <th className="px-4 py-3 sm:py-4 font-semibold text-right">
                                      推薦金
                                    </th>
                                    <th className="px-4 py-3 sm:py-4 font-semibold text-center">
                                      等級
                                    </th>
                                    <th className="px-4 py-3 sm:py-4 font-semibold text-center">
                                      圖表
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ebebeb]">
                                  {adminFiltered.map((c) => (
                                    <Fragment key={c.id}>
                                      <tr
                                        className="hover:bg-[#f9fafb] cursor-pointer transition-colors group"
                                        onClick={() =>
                                          toggleExpandAdminRow(c.id, c.email)
                                        }
                                      >
                                        <td className="px-4 py-3 sm:py-4 align-middle">
                                          <div className="font-semibold text-[#2c6ecb] group-hover:underline truncate max-w-[120px] sm:max-w-[150px]">
                                            {c.name || "—"}
                                          </div>
                                          {c.username && (
                                            <div className="text-[10px] sm:text-xs text-[#6d7175] mt-0.5 truncate max-w-[120px]">
                                              @{c.username}
                                            </div>
                                          )}
                                        </td>
                                        <td
                                          className="px-4 py-3 sm:py-4 align-middle text-slate-700 truncate max-w-[150px] sm:max-w-[200px]"
                                          title={c.email}
                                        >
                                          {c.email}
                                        </td>
                                        <td className="px-4 py-3 sm:py-4 align-middle text-slate-700 whitespace-nowrap">
                                          {c.billingCountry || ""}{" "}
                                          {c.billingCity || ""}
                                        </td>
                                        <td className="px-4 py-3 sm:py-4 align-middle text-right">
                                          {c.ordersCount}
                                        </td>
                                        <td className="px-4 py-3 sm:py-4 align-middle text-right font-bold text-[#202223] whitespace-nowrap">
                                          {formatNTD(c.totalSpent)}
                                        </td>
                                        <td className="px-4 py-3 sm:py-4 align-middle text-right font-semibold text-amber-700 whitespace-nowrap">
                                          {formatNTD(c.referralEarned || 0)}
                                        </td>
                                        <td className="px-4 py-3 sm:py-4 align-middle text-center">
                                          <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap ${c.tier.includes("VIP") ? "bg-indigo-100 text-indigo-700 border border-indigo-200" : c.tier.includes("金") ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-50 text-slate-500 border border-slate-200"}`}
                                          >
                                            {c.tier.replace("貴賓", "")}
                                          </span>
                                        </td>
                                        {/* 💡 修正展開/收起按鈕排版 */}
                                        <td className="px-4 py-3 sm:py-4 align-middle text-center w-24">
                                          <button
                                            className={`inline-flex items-center justify-center gap-1 w-16 px-2 py-1.5 text-[10px] sm:text-xs font-medium border rounded shadow-sm transition-colors ${expandedId === c.id ? "bg-[#1a1a1a] text-white border-black" : "bg-white text-[#202223] border-[#c9cccf] hover:bg-[#f6f6f7]"}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleExpandAdminRow(
                                                c.id,
                                                c.email,
                                              );
                                            }}
                                          >
                                            <BarChart2
                                              size={12}
                                              className={
                                                expandedId === c.id
                                                  ? "text-white"
                                                  : "text-[#008060]"
                                              }
                                            />
                                            <span>
                                              {expandedId === c.id
                                                ? "收起"
                                                : "分析"}
                                            </span>
                                          </button>
                                        </td>
                                      </tr>

                                      {expandedId === c.id && (
                                        <tr className="bg-slate-50/60">
                                          <td
                                            colSpan={8}
                                            className="p-3 sm:p-6 border-t border-[#c9cccf] w-full"
                                          >
                                            <div className="bg-white border border-[#c9cccf] rounded-lg p-3 sm:p-5 shadow-sm w-full overflow-hidden">
                                              <div className="font-bold text-[#202223] text-sm sm:text-lg mb-3 flex flex-wrap items-center gap-2 border-b border-[#ebebeb] pb-2 sm:pb-3 w-full">
                                                <Users
                                                  size={18}
                                                  className="text-[#008060] shrink-0"
                                                />
                                                <span className="truncate break-all max-w-full">
                                                  {c.name || c.username}{" "}
                                                  的圖表與資料
                                                </span>
                                              </div>

                                              <div className="w-full max-w-full overflow-hidden">
                                                <MemberAnalytics
                                                  orders={expandedOrders}
                                                  customer={c}
                                                />
                                              </div>

                                              <div className="mt-6 sm:mt-8 border-t border-[#ebebeb] pt-4 sm:pt-6 w-full">
                                                <div className="font-bold text-[#202223] mb-3 sm:mb-4 text-sm sm:text-base flex items-center gap-2">
                                                  <Package
                                                    size={16}
                                                    className="text-gray-500 shrink-0"
                                                  />{" "}
                                                  詳細訂單列表
                                                </div>
                                                <div className="w-full max-w-full overflow-hidden">
                                                  {renderExpandedOrdersAdmin()}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                      </div>
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
                    <Heart size={48} strokeWidth={1} className="text-[#ccc]" />
                    <p className="text-sm text-[#888]">尚無收藏商品</p>
                    <Link
                      href="/products"
                      className="mt-2 inline-flex items-center gap-2 bg-[#2a514d] px-6 py-2.5 text-sm text-white transition-colors hover:bg-[#1e3d3a]"
                    >
                      <ShoppingBag size={16} />
                      探索商品
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {wishlistItems.map((item) => (
                      <div key={item.id} className="group">
                        <Link
                          href={`/products/${item.slug}`}
                          className="relative mb-2 block aspect-[3/4] overflow-hidden bg-[#eeecea]"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[#ccc]">
                              <ShoppingBag size={40} strokeWidth={1} />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              removeFromWishlist(item.id);
                            }}
                            className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-rose-500 backdrop-blur-sm transition-colors hover:bg-white"
                            aria-label="移除收藏"
                          >
                            <Heart size={14} fill="currentColor" />
                          </button>
                        </Link>
                        <Link
                          href={`/products/${item.slug}`}
                          className="block text-[12px] font-semibold uppercase leading-snug text-black line-clamp-2 hover:opacity-60"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-[12px] text-black">
                          NT {item.price}$
                        </p>
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
