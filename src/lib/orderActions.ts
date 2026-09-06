/**
 * HOVER 訂單狀態／前台按鈕邏輯（對齊客服流程圖）
 *
 * 顯示狀態：處理中｜已出貨｜已到貨｜退貨處理中｜退貨完成｜已取消｜待付款…
 * 前台按鈕：取消訂單（僅待付款）｜申請退貨｜聯繫客服
 */

export const HOVER_LINE_OA = "https://line.me/R/ti/p/@330kefmm";
export const HOVER_LINE_OA_ID = "@330kefmm";

/** 鑑賞期（天）— 以消費者實際取貨／簽收日起算（不是貨到超商門市日） */
export const RETURN_WINDOW_DAYS = 7;

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
  payment_method_title?: string | null;
  shipping_total?: string | number | null;
  logistics_phase?: string | null;
  return_status?: string | null;
  arrived_at?: string | null;
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
    meta_data?: Array<{ key?: string; value?: unknown }>;
  }>;
  meta_data?: Array<{ key?: string; value?: unknown }>;
};

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

/**
 * 統一前台顯示階段（含退貨）
 */
export function resolveOrderDisplayPhase(order: OrderLike): OrderDisplayPhase {
  const s = String(order.status || "").toLowerCase();
  const statusKey = s.replace(/_/g, "-");
  const phase = String(order.logistics_phase || "").toLowerCase();
  const ret = resolveReturnStatus(order);

  if (s === "cancelled" || s === "canceled") return "cancelled";
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
  const raw = String(order.logistics_phase || "").toLowerCase();
  if (raw === "arrived") return "已到店（待取）";
  if (raw === "picked") return "已取貨";
  if (raw === "unclaimed") return "逾期未取";

  const phase = resolveOrderDisplayPhase(order);
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

/** 消費者可自行取消：僅 ATM／待付款、尚未付款 */
export function isOrderCustomerCancellable(order: OrderLike): boolean {
  const phase = resolveOrderDisplayPhase(order);
  if (phase !== "pending") return false;
  if (order.date_paid) return false;
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
  return `https://line.me/R/oaMessage/${HOVER_LINE_OA_ID}/?text=${encodeURIComponent(text)}`;
}

function formatReturnNt(value: string | number | null | undefined): string {
  const n = Math.round(
    Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0,
  );
  return `NT.${Math.abs(n).toLocaleString("en-US")}`;
}

function formatReturnYmd(value?: string | null): string {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  } catch {
    return "";
  }
}

function itemVariantForReturn(
  item: NonNullable<OrderLike["line_items"]>[number],
): string {
  const metas = Array.isArray(item?.meta_data) ? item.meta_data : [];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const m of metas) {
    const p = String(m?.value || "").trim();
    if (!p) continue;
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(p);
  }
  return unique.join(" / ");
}

export function getFirstOrderItemImage(order: OrderLike): string {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  for (const it of items) {
    const src = String(it?.image || "").trim();
    if (src) return src;
  }
  return "";
}

/**
 * LINE 預填訊息（申請退貨／聯繫客服共用訂單欄位）
 * 保持精簡：過長會讓 QR 過密、掃不到。
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

  const storeName = metaVal(order, [
    "_shipping_cvs_store_name",
    "shipping_cvs_store_name",
  ]);
  if (storeName) lines.push(`取件門市：${storeName}`);

  const items = Array.isArray(order.line_items) ? order.line_items : [];
  if (items.length) {
    const brief = items
      .slice(0, 3)
      .map((it) => {
        const name = String(it?.name || "商品").trim();
        const variant = itemVariantForReturn(it);
        const qty = Number(it?.quantity || 1);
        return variant
          ? `${name}（${variant}）x${qty}`
          : `${name} x${qty}`;
      })
      .join("；");
    lines.push(`商品：${brief}`);
    if (items.length > 3) lines.push(`（另有 ${items.length - 3} 件）`);
  }

  // 商品圖：僅附第一張網址（縮短參數避免 QR 爆掉；過長時省略）
  const image = getFirstOrderItemImage(order);
  if (image && image.length <= 180) {
    lines.push(`商品圖：${image}`);
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
  return `https://line.me/R/oaMessage/${HOVER_LINE_OA_ID}/?text=${encodeURIComponent(text)}`;
}

/**
 * 電腦版 QR 掃的短網址（落地頁再轉 LINE）
 * 避免直接把超長 LINE URL 編進 QR 造成「怪點、掃不到」
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

  const first = order.line_items?.[0];
  if (first) {
    const name = String(first.name || "").trim().slice(0, 40);
    const variant = itemVariantForReturn(first).slice(0, 20);
    const qty = Number(first.quantity || 1);
    params.set("i", [name, variant, qty].filter(Boolean).join("|"));
  }

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

/** 從 /return-line query 還原預填文字 */
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
  if (params.i) {
    const [name, variant, qty] = String(params.i).split("|");
    const item =
      name && variant
        ? `${name}（${variant}）x${qty || 1}`
        : name
          ? `${name} x${qty || 1}`
          : "";
    if (item) lines.push(`商品：${item}`);
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
