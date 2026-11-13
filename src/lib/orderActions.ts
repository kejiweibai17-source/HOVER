/**
 * HOVER 訂單狀態／前台按鈕邏輯（對齊客服流程圖）
 *
 * 顯示狀態：處理中｜已出貨｜已到貨｜退貨處理中｜退貨完成｜已取消｜待付款…
 * 前台按鈕：取消訂單（僅待付款）｜申請退貨｜聯繫客服
 */

import {
  HOVER_LINE_OA,
  HOVER_LINE_OA_ID,
} from "@/lib/hoverContact";

export { HOVER_LINE_OA, HOVER_LINE_OA_ID };

/** 鑑賞期（天）— 以消費者實際取貨／簽收日起算（不是貨到超商門市日） */
export const RETURN_WINDOW_DAYS = 7;

import { formatTaipei } from "@/lib/taipeiTime";

export type OrderActionKind = "cancel" | "return" | "contact";

export type OrderDisplayPhase =
  | "pending"
  | "processing"
  | "shipped"
  | "arrived"
  | "returning"
  | "returned"
  | "cancelled"
  | "refunded"
  | "failed"
  | "other";

export type OrderLike = {
  id?: string | number;
  number?: string | number;
  status?: string;
  date_created?: string;
  date_paid?: string | null;
  date_completed?: string | null;
  total?: string | number | null;
  payment_method?: string | null;
  payment_method_title?: string | null;
  shipping_total?: string | number | null;
  logistics_phase?: string | null;
  return_status?: string | null;
  arrived_at?: string | null;
  payment_info?: {
    bank_code?: string;
    atm_account?: string;
    expire_date?: string;
    cvs_code?: string;
  } | null;
  shipping?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    address_1?: string;
  } | null;
  shipping_lines?: Array<{ method_title?: string; method_id?: string }>;
  line_items?: Array<{
    name?: string;
    quantity?: number;
    total?: string | number;
    price?: string | number;
    image?: string;
    sku?: string;
    promotion_kind?: "gift" | "addon" | "" | string;
    random_color?: boolean;
    meta_data?: Array<{ key?: string; value?: unknown }>;
  }>;
  meta_data?: Array<{ key?: string; value?: unknown }>;
};

export type OrderCancelReason =
  | "atm_expire"
  | "customer"
  | "admin"
  | "";

function metaVal(order: OrderLike, keys: string[]): string {
  if (!Array.isArray(order.meta_data)) return "";
  const wanted = keys.map((k) => k.toLowerCase());
  for (const item of order.meta_data) {
    const key = String(item?.key || "").toLowerCase();
    if (!wanted.some((k) => key === k || key.endsWith(k))) continue;
    const val = Array.isArray(item.value) ? item.value[0] : item.value;
    const str = String(val ?? "").trim();
    if (str) return str;
  }
  return "";
}

export function resolveReturnStatus(order: OrderLike): string {
  const direct = String(order.return_status || "").toLowerCase().trim();
  if (direct) return direct;
  return metaVal(order, ["_hover_return_status", "hover_return_status"]).toLowerCase();
}

export function resolveArrivedAt(order: OrderLike): string | null {
  const direct = String(order.arrived_at || "").trim();
  if (direct) return direct;
  const fromMeta = metaVal(order, [
    "_hover_arrived_at",
    "hover_arrived_at",
    "_hel_UpdateStatusDate",
  ]);
  return fromMeta || null;
}

/** 是否為 ATM／虛擬帳號付款單 */
export function isAtmPaymentOrderLike(order: OrderLike): boolean {
  const method = String(order.payment_method || "").toLowerCase();
  const title = String(order.payment_method_title || "").toLowerCase();
  if (
    method.includes("atm") ||
    title.includes("atm") ||
    title.includes("虛擬帳號") ||
    title.includes("轉帳")
  ) {
    return true;
  }
  const expire = String(order.payment_info?.expire_date || "").trim();
  const account = String(order.payment_info?.atm_account || "").trim();
  if (expire || account) return true;
  return Boolean(
    metaVal(order, [
      "_ExpireDate",
      "ExpireDate",
      "_vAccount",
      "vAccount",
      "_ecpay_atm_expire_date",
    ]),
  );
}

/** 解析 ATM 繳費期限 → epoch ms（僅日期視為當日 23:59:59） */
export function parseAtmExpireTimestamp(order: OrderLike): number {
  const raw =
    String(order.payment_info?.expire_date || "").trim() ||
    metaVal(order, [
      "_ExpireDate",
      "ExpireDate",
      "_ecpay_atm_expire_date",
    ]);
  if (!raw) return 0;

  const cleaned = raw
    .replace(/[年.]/g, "/")
    .replace(/月/g, "/")
    .replace(/日/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(cleaned)) {
    const normalized = cleaned.replace(/\//g, "-") + "T23:59:59";
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const d = new Date(cleaned.replace(/\//g, "-"));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** 系統／後台標記為 ATM 逾期自動取消 */
export function isAtmAutoCancelled(order: OrderLike): boolean {
  if (metaVal(order, ["_hover_atm_auto_cancelled", "hover_atm_auto_cancelled"]) === "1") {
    return true;
  }
  const by = metaVal(order, ["_hover_cancelled_by", "hover_cancelled_by"]).toLowerCase();
  if (by === "atm_expire_cron") return true;
  const reason = metaVal(order, [
    "_hover_cancel_reason",
    "hover_cancel_reason",
  ]).toLowerCase();
  return reason === "atm_expire_unpaid" || reason === "atm_expire";
}

/** 待付款 ATM 且已過繳費期限（cron 尚未同步 cancelled 時也成立） */
export function isAtmUnpaidPastExpire(order: OrderLike, now = new Date()): boolean {
  if (order.date_paid) return false;
  if (!isAtmPaymentOrderLike(order)) return false;
  const s = String(order.status || "").toLowerCase();
  if (
    s === "processing" ||
    s === "completed" ||
    s === "refunded" ||
    s === "paid"
  ) {
    return false;
  }
  const ts = parseAtmExpireTimestamp(order);
  return ts > 0 && now.getTime() > ts;
}

export function resolveOrderCancelReason(order: OrderLike): OrderCancelReason {
  if (isAtmAutoCancelled(order)) return "atm_expire";
  const by = metaVal(order, ["_hover_cancelled_by", "hover_cancelled_by"]).toLowerCase();
  if (by === "customer") return "customer";
  if (by === "admin") return "admin";
  if (isAtmUnpaidPastExpire(order)) return "atm_expire";
  const s = String(order.status || "").toLowerCase();
  if (s === "cancelled" || s === "canceled") {
    if (isAtmPaymentOrderLike(order) && !order.date_paid) return "atm_expire";
  }
  return "";
}

export function getOrderCancelReasonLabel(order: OrderLike): string {
  switch (resolveOrderCancelReason(order)) {
    case "atm_expire":
      return "逾期未付款";
    case "customer":
      return "會員取消訂單";
    case "admin":
      return "客服取消訂單";
    default:
      return "";
  }
}

/**
 * 統一前台顯示階段（含退貨）
 */
export function resolveOrderDisplayPhase(order: OrderLike): OrderDisplayPhase {
  const s = String(order.status || "").toLowerCase();
  const statusKey = s.replace(/_/g, "-");
  const phase = String(order.logistics_phase || "").toLowerCase();
  const ret = resolveReturnStatus(order);

  if (s === "cancelled" || s === "canceled") return "cancelled";
  // ATM 逾期：即使 WC 狀態尚未同步為 cancelled，前台也視為已取消
  if (isAtmAutoCancelled(order) || isAtmUnpaidPastExpire(order)) {
    return "cancelled";
  }
  if (s === "refunded" && (ret === "returned" || ret === "complete")) return "returned";
  if (s === "refunded") return "refunded";
  if (s === "failed") return "failed";
  if (
    s === "pending" ||
    s === "on-hold" ||
    s === "waiting-payment" ||
    s === "待付款"
  ) {
    return "pending";
  }

  if (ret === "returning" || ret === "processing") return "returning";
  if (ret === "returned" || ret === "complete" || ret === "completed") {
    return "returned";
  }

  if (phase === "arrived" || phase === "picked") return "arrived";
  if (phase === "unclaimed") return "arrived"; // 仍顯示已到貨語意，或可另標逾期
  if (phase === "shipped") return "shipped";

  if (statusKey.includes("at-cvs") || statusKey.includes("wait-pick")) {
    return "arrived";
  }
  if (statusKey.includes("out-cvs") || statusKey.includes("overdue")) {
    return "arrived";
  }
  if (statusKey.includes("transport")) return "shipped";

  if (s === "completed") return "shipped";
  if (s === "processing" || s === "paid") return "processing";

  return "other";
}

export function getOrderStatusLabelFromPhase(phase: OrderDisplayPhase, fallback = "—"): string {
  switch (phase) {
    case "pending":
      return "待付款";
    case "processing":
      return "處理中";
    case "shipped":
      return "已出貨";
    case "arrived":
      return "已到貨";
    case "returning":
      return "退貨處理中";
    case "returned":
      return "退貨完成";
    case "cancelled":
      return "已取消";
    case "refunded":
      return "已退款";
    case "failed":
      return "失敗";
    default:
      return fallback;
  }
}

export function getOrderStatusLabel(order: OrderLike): string {
  // 退貨狀態優先於物流貨態（否則「退貨處理中」會被已取貨蓋掉）
  const phase = resolveOrderDisplayPhase(order);
  if (phase === "returning" || phase === "returned") {
    return getOrderStatusLabelFromPhase(phase);
  }

  if (phase === "cancelled") {
    const reason = resolveOrderCancelReason(order);
    if (reason === "atm_expire") return "已取消（逾期未付款）";
    return "已取消";
  }

  const raw = String(order.logistics_phase || "").toLowerCase();
  if (raw === "arrived") return "已到店（待取）";
  if (raw === "picked") return "已取貨";
  if (raw === "unclaimed") return "逾期未取";

  if (phase === "other") {
    return String(order.status || "—");
  }
  return getOrderStatusLabelFromPhase(phase);
}

function parseReceivedDate(order: OrderLike): Date | null {
  const raw = resolveArrivedAt(order);
  if (!raw) return null;
  // 綠界 UpdateStatusDate 常為 Y/m/d H:i:s 或 Y-m-d
  const normalized = raw.replace(/\//g, "-");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}

/**
 * 已取貨／已簽收，且在鑑賞期內。
 * 貨到門市尚未取貨 → 不算；無收受時間 → 不開放申請退貨按鈕。
 */
export function isWithinReturnWindow(order: OrderLike, now = new Date()): boolean {
  const phase = resolveOrderDisplayPhase(order);
  if (phase !== "arrived") return false;

  const rawPhase = String(order.logistics_phase || "").toLowerCase();
  // 逾期未取：未收受商品
  if (rawPhase === "unclaimed") return false;
  // 僅到店待取、尚未寫入收受時間
  if (rawPhase === "arrived") return false;

  const received = parseReceivedDate(order);
  if (!received) return false;

  const end = new Date(received);
  end.setDate(end.getDate() + RETURN_WINDOW_DAYS);
  end.setHours(23, 59, 59, 999);
  return now.getTime() <= end.getTime();
}

/** 消費者可自行取消：僅 ATM／待付款、尚未付款、且未逾期 */
export function isOrderCustomerCancellable(order: OrderLike): boolean {
  if (order.date_paid) return false;
  if (isAtmAutoCancelled(order) || isAtmUnpaidPastExpire(order)) return false;
  const phase = resolveOrderDisplayPhase(order);
  if (phase !== "pending") return false;
  const s = String(order.status || "").toLowerCase();
  return (
    s === "pending" ||
    s === "on-hold" ||
    s === "waiting-payment" ||
    s === "待付款"
  );
}

/**
 * 前台應顯示的操作按鈕
 */
export function resolveOrderAction(order: OrderLike): OrderActionKind {
  const phase = resolveOrderDisplayPhase(order);

  // 僅待付款（如 ATM 未轉帳）→ 可自行取消
  if (isOrderCustomerCancellable(order)) return "cancel";
  if (phase === "arrived" && isWithinReturnWindow(order)) return "return";
  return "contact";
}

export type LineCsIntent = "return" | "contact";

function lineCsGreeting(intent: LineCsIntent): string {
  return intent === "return"
    ? "你好，我想申請退貨。"
    : "你好，我想聯繫客服詢問訂單。";
}

/** 聯繫客服：LINE OA 預填連結（含訂單資訊） */
export function buildContactCsUrl(order?: OrderLike | null): string {
  if (!order) return HOVER_LINE_OA;
  const text = buildOrderLineMessage(order, "contact");
  // LINE oaMessage：? 後整段即預填訊息，不可加 text=（否則訊息會出現「text=」）
  return `https://line.me/R/oaMessage/${HOVER_LINE_OA_ID}/?${encodeURIComponent(text)}`;
}

function formatReturnNt(value: string | number | null | undefined): string {
  const n = Math.round(
    Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0,
  );
  return `NT.${Math.abs(n).toLocaleString("en-US")}`;
}

function formatReturnYmd(value?: string | null): string {
  if (!value) return "";
  return formatTaipei(value, false);
}

function looksLikeSizeToken(value: string): boolean {
  return /^(XXS|XS|S|M|L|XL|XXL|2XL|3XL|F)$/i.test(String(value || "").trim());
}

function splitSpecTokens(raw: string): string[] {
  return String(raw || "")
    .split(/\s*[\/／|,，|｜]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 規格：尺寸｜顏色（略過活動 meta；隨機贈只顯示「顏色隨機出貨」） */
function itemVariantForReturn(
  item: NonNullable<OrderLike["line_items"]>[number],
): string {
  const metas = Array.isArray(item?.meta_data) ? item.meta_data : [];
  const sizeKeys = /尺寸|size|pa_size|pa_尺寸/i;
  const colorKeys = /顏色|color|colour|pa_color|pa_顏色|pa_colour/i;
  const skipKeys =
    /^(variant|_reduced_stock|數量|qty|quantity|_hover_promotion|活動類型|活動名稱|活動編號|成交單價|貨號|sku|id|出貨\s*sku|出貨備註)$/i;

  let sizeRaw = "";
  let colorRaw = "";
  const extras: string[] = [];

  for (const m of metas) {
    const key = String(m?.key || "").trim();
    const raw = String(m?.value || "").trim();
    if (!raw || skipKeys.test(key) || key.startsWith("_")) continue;

    if (sizeKeys.test(key) && !sizeRaw) {
      sizeRaw = raw;
      continue;
    }
    if (colorKeys.test(key) && !colorRaw) {
      colorRaw = raw;
      continue;
    }
    if (/variant|規格|選項/i.test(key) || /[\/／|,，|｜]/.test(raw)) {
      extras.push(...splitSpecTokens(raw));
      continue;
    }
    extras.push(raw);
  }

  const tokens = [
    ...splitSpecTokens(sizeRaw),
    ...splitSpecTokens(colorRaw),
    ...extras.flatMap((t) => splitSpecTokens(t)),
  ];
  let size = "";
  let color = "";
  for (const token of tokens) {
    if (!token || /^顏色隨機出貨$/i.test(token)) continue;
    if (looksLikeSizeToken(token)) {
      if (!size) size = token.toUpperCase() === "F" ? "F" : token;
      continue;
    }
    if (!color) color = token;
  }

  const randomColor =
    String(item?.promotion_kind || "") === "gift" && Boolean(item?.random_color);
  if (randomColor) {
    return [size, "顏色隨機出貨"].filter(Boolean).join("｜");
  }
  return [size, color].filter(Boolean).join("｜");
}

function itemPromotionPrefix(
  item: NonNullable<OrderLike["line_items"]>[number],
): string {
  const kind = String(item?.promotion_kind || "");
  if (kind === "gift") return "[滿額贈]";
  if (kind === "addon") return "[加價購]";
  return "";
}

/** 單列商品：品名（規格）x數量，含加購／贈品標示 */
export function formatOrderLineItemForCs(
  item: NonNullable<OrderLike["line_items"]>[number],
): string {
  const prefix = itemPromotionPrefix(item);
  const name = String(item?.name || "商品").trim() || "商品";
  const variant = itemVariantForReturn(item);
  const qty = Number(item?.quantity || 1) || 1;
  const body = variant ? `${name}（${variant}）x${qty}` : `${name} x${qty}`;
  return `${prefix}${body}`;
}

export function getFirstOrderItemImage(order: OrderLike): string {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  for (const it of items) {
    const src = String(it?.image || "").trim();
    if (src) return src;
  }
  return "";
}

function resolveCvsStoreName(order: OrderLike): string {
  return metaVal(order, [
    "_shipping_cvs_store_name",
    "shipping_cvs_store_name",
  ]);
}

/**
 * LINE 預填訊息（申請退貨／聯繫客服共用）
 * 手機直接開 LINE、電腦「已安裝 LINE」按鈕共用此文案。
 * 不附商品圖／圖片網址（避免 LINE 自動預覽多餘圖）。
 */
export function buildOrderLineMessage(
  order: OrderLike,
  intent: LineCsIntent = "return",
): string {
  const orderNo = String(order.number || order.id || "").trim() || "（未知）";
  const lines: string[] = [lineCsGreeting(intent), `訂單編號：${orderNo}`];

  const date = formatReturnYmd(order.date_created);
  if (date) lines.push(`訂單日期：${date}`);
  if (order.total != null && String(order.total).trim() !== "") {
    lines.push(`訂單金額：${formatReturnNt(order.total)}`);
  }
  if (order.payment_method_title) {
    lines.push(`付款方式：${String(order.payment_method_title)}`);
  }

  const shipTitle = String(order.shipping_lines?.[0]?.method_title || "").trim();
  if (shipTitle) lines.push(`配送方式：${shipTitle}`);

  const storeName = resolveCvsStoreName(order);
  if (storeName) lines.push(`取件門市：${storeName}`);

  const items = Array.isArray(order.line_items) ? order.line_items : [];
  if (items.length) {
    lines.push("商品清單：");
    for (const it of items) {
      lines.push(`・${formatOrderLineItemForCs(it)}`);
    }
  }

  return lines.join("\n");
}

/** @deprecated 請改用 buildOrderLineMessage(order, "return") */
export function buildReturnLineMessage(order: OrderLike): string {
  return buildOrderLineMessage(order, "return");
}

/** 申請退貨：LINE OA 預填連結（含訂單編號／商品摘要） */
export function buildReturnLineUrl(order: OrderLike): string {
  const text = buildOrderLineMessage(order, "return");
  return `https://line.me/R/oaMessage/${HOVER_LINE_OA_ID}/?${encodeURIComponent(text)}`;
}

/** 壓縮商品列供 QR bridge：name|variant|qty|kind~... */
function encodeLineItemsForBridge(order: OrderLike): string {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  return items
    .map((it) => {
      const name = String(it?.name || "商品").trim().slice(0, 48);
      const variant = itemVariantForReturn(it).slice(0, 24);
      const qty = Number(it?.quantity || 1) || 1;
      const kind = String(it?.promotion_kind || "");
      const tag = kind === "gift" || kind === "addon" ? kind : "";
      return [name, variant, qty, tag].join("|");
    })
    .join("~");
}

/**
 * 電腦版 QR 掃的短網址（落地頁再轉 LINE）
 * 帶入與手機相同的訂單欄位＋完整商品清單（不含圖片）。
 */
export function buildOrderLineBridgePath(
  order: OrderLike,
  intent: LineCsIntent = "return",
): string {
  const orderNo = String(order.number || order.id || "").trim();
  const params = new URLSearchParams();
  if (intent === "contact") params.set("m", "contact");
  params.set("n", orderNo);
  const date = formatReturnYmd(order.date_created);
  if (date) params.set("d", date);
  if (order.total != null) {
    const n = Math.round(
      Number(String(order.total).replace(/[^\d.-]/g, "")) || 0,
    );
    params.set("t", String(n));
  }
  if (order.payment_method_title) {
    params.set("p", String(order.payment_method_title).slice(0, 40));
  }
  const ship = String(order.shipping_lines?.[0]?.method_title || "").trim();
  if (ship) params.set("s", ship.slice(0, 40));
  const store = resolveCvsStoreName(order);
  if (store) params.set("cvs", store.slice(0, 40));

  const goods = encodeLineItemsForBridge(order);
  if (goods) params.set("g", goods);

  return `/return-line?${params.toString()}`;
}

export function buildReturnLineBridgePath(order: OrderLike): string {
  return buildOrderLineBridgePath(order, "return");
}

export function buildContactLineBridgePath(order: OrderLike): string {
  return buildOrderLineBridgePath(order, "contact");
}

export function buildReturnLineQrImageUrl(
  bridgeAbsoluteUrl: string,
  size = 260,
): string {
  // ecc=M + 較大尺寸，短網址掃起來才正常
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&margin=12&data=${encodeURIComponent(bridgeAbsoluteUrl)}`;
}

/** 從 /return-line query 還原預填文字（與 buildOrderLineMessage 欄位一致） */
export function buildOrderLineMessageFromParams(
  params: Record<string, string | null | undefined>,
): string {
  const intent: LineCsIntent =
    String(params.m || "").toLowerCase() === "contact" ? "contact" : "return";
  const lines = [lineCsGreeting(intent)];
  if (params.n) lines.push(`訂單編號：${params.n}`);
  if (params.d) lines.push(`訂單日期：${params.d}`);
  if (params.t) lines.push(`訂單金額：${formatReturnNt(params.t)}`);
  if (params.p) lines.push(`付款方式：${params.p}`);
  if (params.s) lines.push(`配送方式：${params.s}`);
  if (params.cvs) lines.push(`取件門市：${params.cvs}`);

  const goodsRaw = String(params.g || "").trim();
  if (goodsRaw) {
    const rows = goodsRaw
      .split("~")
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [name, variant, qty, kind] = row.split("|");
        const prefix =
          kind === "gift" ? "[滿額贈]" : kind === "addon" ? "[加價購]" : "";
        const n = String(name || "").trim();
        if (!n) return "";
        const v = String(variant || "").trim();
        const q = String(qty || "1").trim() || "1";
        const body = v ? `${n}（${v}）x${q}` : `${n} x${q}`;
        return `・${prefix}${body}`;
      })
      .filter(Boolean);
    if (rows.length) {
      lines.push("商品清單：");
      lines.push(...rows);
    }
  } else if (params.i) {
    // 相容舊版只帶第一件的 i=
    const [name, variant, qty] = String(params.i).split("|");
    const item =
      name && variant
        ? `${name}（${variant}）x${qty || 1}`
        : name
          ? `${name} x${qty || 1}`
          : "";
    if (item) {
      lines.push("商品清單：");
      lines.push(`・${item}`);
    }
  }
  return lines.join("\n");
}

/** @deprecated 請改用 buildOrderLineMessageFromParams */
export function buildReturnLineMessageFromParams(
  params: Record<string, string | null | undefined>,
): string {
  return buildOrderLineMessageFromParams(params);
}

export function getOrderActionHref(order: OrderLike, kind: OrderActionKind): string {
  if (kind === "return") return buildReturnLineUrl(order);
  if (kind === "contact") return buildContactCsUrl(order);
  return "#";
}

export function getOrderActionLabel(
  kind: OrderActionKind,
  order?: OrderLike,
): string {
  if (kind === "cancel") return "取消訂單";
  if (kind === "return") return "申請退貨";
  if (order && resolveOrderDisplayPhase(order) === "processing") {
    return "聯繫客服";
  }
  return "聯繫客服";
}

/** primary = 實心綠；secondary = 白底綠框 */
export function getOrderActionVariant(kind: OrderActionKind): "primary" | "secondary" {
  return kind === "contact" ? "primary" : "secondary";
}
