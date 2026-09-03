// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  calcMemberDiscountAmount,
  computeMembership,
  mapWcOrdersToLite,
} from "@/lib/membership";
import {
  buildMasterCouponUsedMeta,
  fetchCustomerMembership,
  isMasterCouponCode,
  validateMasterCouponForMeta,
} from "@/lib/masterCoupons";
import { checkCartStock } from "@/lib/validateCartStock";
import { fetchShippingSettings, shippingFeeFor } from "@/lib/shippingDefaults";
import { generateCheckMacValue, getEcpayDate } from "@/lib/ecpay";
import {
  invoiceMetaEntries,
  validateInvoicePreference,
  type InvoicePreference,
} from "@/lib/ecpay-invoice";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

const MERCHANT_ID = (process.env.ECPAY_MERCHANT_ID || "").trim();
const HASH_KEY = (process.env.ECPAY_HASH_KEY || "").trim();
const HASH_IV = (process.env.ECPAY_HASH_IV || "").trim();
const ECPAY_URL = process.env.ECPAY_API_URL || "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5"; 

const LINEPAY_CHANNEL_ID = process.env.LINEPAY_CHANNEL_ID!;
const LINEPAY_CHANNEL_SECRET = process.env.LINEPAY_CHANNEL_SECRET!;
const LINEPAY_BASE_URL = process.env.LINEPAY_BASE_URL || "https://api-pay.line.me"; 

interface CartItem {
  wcProductId: number;
  wcVariationId?: number;
  qty: number;
  price: number;
  title: string;
  name?: string;
  id?: string | number;
  onSale?: boolean;
}
interface ContactInfo { email: string; }
interface AddressInfo { firstName: string; lastName: string; line1: string; phone: string; storeId?: string; storeName?: string; storeAddr?: string; }
interface RequestBody {
  items: CartItem[];
  contact: ContactInfo;
  addr: AddressInfo;
  total: number;
  shipMethod: string;
  payMethod?: string;
  coupon?: { code: string; amount: number } | string | null;
  memberDiscount?: number;
  invoice?: InvoicePreference | null;
}

async function productIsOnSale(
  auth: string,
  productId: number,
  variationId?: number,
): Promise<boolean> {
  try {
    const root = BASE.replace(/\/$/, "");
    const url =
      variationId && variationId > 0
        ? `${root}/wp-json/wc/v3/products/${productId}/variations/${variationId}`
        : `${root}/wp-json/wc/v3/products/${productId}`;
    const res = await fetch(url, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const product = await res.json();
    return Boolean(product.on_sale);
  } catch {
    return false;
  }
}

/** 折扣碼用量 +1（訂單以 fee_line 套用精確折抵，不走 WC coupon_lines 重算） */
async function bumpCouponUsage(auth: string, code: string, email: string) {
  try {
    const res = await fetch(
      `${BASE.replace(/\/$/, "")}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    if (!res.ok) return;
    const arr = await res.json();
    if (!Array.isArray(arr) || !arr[0]?.id) return;
    const coupon = arr[0];
    const usedBy = Array.isArray(coupon.used_by) ? [...coupon.used_by] : [];
    const emailLc = email.trim().toLowerCase();
    if (emailLc && !usedBy.map((e: string) => String(e).toLowerCase()).includes(emailLc)) {
      usedBy.push(emailLc);
    }
    await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/coupons/${coupon.id}`, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        usage_count: (Number(coupon.usage_count) || 0) + 1,
        used_by: usedBy,
      }),
    });
  } catch (e) {
    console.error("bumpCouponUsage failed:", e);
  }
}

async function markMasterCouponUsed(
  auth: string,
  customerId: number,
  code: string,
) {
  if (!customerId || !isMasterCouponCode(code)) return;
  try {
    const updates = buildMasterCouponUsedMeta(code);
    if (!updates.length) return;
    await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ meta_data: updates }),
    });
  } catch (e) {
    console.error("markMasterCouponUsed failed:", e);
  }
}

async function validateCouponOnServer(
  auth: string,
  code: string,
  email: string,
  subtotalAfterMember: number,
  hasMemberDiscount: boolean,
  hasSaleItems = false,
  customerId = 0,
): Promise<{ amount: number; code: string } | null> {
  const res = await fetch(
    `${BASE.replace(/\/$/, "")}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
    { headers: { Authorization: auth }, cache: "no-store" },
  );
  if (!res.ok) return null;
  const arr = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const coupon = arr[0];

  if (isMasterCouponCode(code)) {
    if (!customerId) return null;
    const { meta, membership } = await fetchCustomerMembership(
      BASE,
      auth,
      customerId,
    );
    const eligibility = validateMasterCouponForMeta(code, meta, membership, {
      loggedIn: true,
    });
    if (!eligibility.valid) return null;
    if (coupon.individual_use && hasMemberDiscount) return null;

    const minAmount = Number(coupon.minimum_amount || 0);
    if (minAmount > 0 && subtotalAfterMember < minAmount) return null;

    const type = String(coupon.discount_type || "fixed_cart");
    const amount = Number(coupon.amount || 0);
    let discount = 0;
    if (type === "percent") discount = Math.round(subtotalAfterMember * (amount / 100));
    else if (type === "fixed_cart" || type === "fixed_product") {
      discount = Math.min(amount, subtotalAfterMember);
    }
    if (discount <= 0) return null;
    return { amount: discount, code: String(coupon.code || code) };
  }

  if (coupon.individual_use && hasMemberDiscount) return null;
  if (coupon.exclude_sale_items && hasSaleItems) return null;
  if (coupon.date_expires && new Date(coupon.date_expires).getTime() < Date.now()) return null;

  const usageLimit = Number(coupon.usage_limit || 0);
  const usageCount = Number(coupon.usage_count || 0);
  if (usageLimit > 0 && usageCount >= usageLimit) return null;

  const minAmount = Number(coupon.minimum_amount || 0);
  if (minAmount > 0 && subtotalAfterMember < minAmount) return null;

  const emails: string[] = Array.isArray(coupon.email_restrictions)
    ? coupon.email_restrictions.map((e: string) => String(e).toLowerCase())
    : [];
  if (emails.length > 0 && !emails.includes(email.trim().toLowerCase())) return null;

  const type = String(coupon.discount_type || "fixed_cart");
  const amount = Number(coupon.amount || 0);
  let discount = 0;
  if (type === "percent") discount = Math.round(subtotalAfterMember * (amount / 100));
  else if (type === "fixed_cart" || type === "fixed_product") {
    discount = Math.min(amount, subtotalAfterMember);
  }
  if (discount <= 0) return null;
  return { amount: discount, code: String(coupon.code || code) };
}

function toTwdInt(value: unknown): number {
  const n = Math.round(Number(String(value ?? "").replace(/,/g, "").replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : NaN;
}

/** 官網 payMethod → 綠界 ChoosePayment（禁止 ALL，避免付款頁帶入其他方式） */
function resolveEcpayChoosePayment(
  payMethod?: string,
): "Credit" | "ATM" | null {
  if (payMethod === "card") return "Credit";
  if (payMethod === "atm") return "ATM";
  return null;
}

/**
 * 指定 ChoosePayment 時，綠界仍可能連動顯示的項目（以 IgnorePayment 排除）。
 * - Credit：2025/4/1 起會同步顯示 Apple Pay → 帶 ApplePay
 * - 勿傳 DeviceSource=gwpay，避免導向綠界Pay APP 流程
 */
function buildEcpayIgnorePayment(
  choosePayment: "Credit" | "ATM",
): string | undefined {
  const hide: string[] = [];
  if (choosePayment === "Credit") {
    hide.push("ApplePay", "GooglePay");
  }
  return hide.length > 0 ? hide.join("#") : undefined;
}

function basicAuth(): string | undefined {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function escapeHtmlAttr(v: string | number): string {
  return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function generateLinePaySignature(uri: string, requestBody: string, nonce: string): string {
  const message = `${LINEPAY_CHANNEL_SECRET}${uri}${requestBody}${nonce}`;
  return crypto.createHmac("sha256", LINEPAY_CHANNEL_SECRET).update(message).digest("base64");
}

export async function POST(req: Request) {
  try {
    const auth = basicAuth();
    if (!MERCHANT_ID || !HASH_KEY || !HASH_IV) {
      return NextResponse.json({ ok: false, message: "Server Config Error" }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    let loggedInCustomerId = (session as any)?.customerId || 0;

    const body: RequestBody = await req.json();
    const { items, contact, addr, total, shipMethod, payMethod, memberDiscount } = body;
    let couponInput = body.coupon;
    if (typeof couponInput === "string") {
      couponInput = couponInput ? { code: couponInput, amount: 0 } : null;
    }
    const coupon = couponInput && typeof couponInput === "object" ? couponInput : null;

    const invoiceCheck = validateInvoicePreference(body.invoice || { type: "cloud" });
    if (!invoiceCheck.ok) {
      return NextResponse.json({ ok: false, message: invoiceCheck.message }, { status: 400 });
    }
    const invoicePref = invoiceCheck.value;

    // ============================================================================
    // 🛡️ 後端計價防護網 (平衡版：嚴格驗算數學邏輯，完美相容 WooCommerce 變體與外掛)
    // ============================================================================
    let calculatedSubtotal = 0;
    let regularSubtotal = 0;
    for (const item of items) {
      // 確保至少有傳入 ID
      if (!item.wcProductId && !item.id) {
        return NextResponse.json({ ok: false, message: "商品資料異常" }, { status: 400 });
      }
      const unit = toTwdInt(item.price);
      const qty = Math.max(1, Math.round(Number(item.qty) || 0));
      if (!Number.isFinite(unit) || unit < 0 || !Number.isFinite(qty)) {
        return NextResponse.json({ ok: false, message: "商品金額異常" }, { status: 400 });
      }
      const lineTotal = unit * qty;
      calculatedSubtotal += lineTotal;
      const productId = Number(item.wcProductId || item.id);
      const variationId = Number(item.wcVariationId) || 0;
      if (typeof item.onSale === "boolean") {
        if (!item.onSale) regularSubtotal += lineTotal;
      } else if (auth && productId) {
        const onSale = await productIsOnSale(auth, productId, variationId || undefined);
        if (!onSale) regularSubtotal += lineTotal;
      } else {
        regularSubtotal += lineTotal;
      }
    }

    // 庫存對齊 WooCommerce（禁止無庫存下單 / 數量上限）
    if (auth && BASE && items?.length) {
      const stockCheck = await checkCartStock(BASE, auth, items);
      if (!stockCheck.ok) {
        return NextResponse.json(
          { ok: false, message: stockCheck.message || "庫存不足" },
          { status: 409 },
        );
      }
    }

    const claimedMemberDiscount = Number(memberDiscount) || 0;
    let claimedCouponDiscount = coupon ? Number(coupon.amount) || 0 : 0;

    // 伺服器端會員折扣驗算
    let serverMemberDiscount = 0;
    if (loggedInCustomerId && auth && BASE) {
      try {
        const cRes = await fetch(
          `${BASE.replace(/\/$/, "")}/wp-json/wc/v3/customers/${loggedInCustomerId}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        if (cRes.ok) {
          const customer = await cRes.json();
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
          const oRes = await fetch(
            `${BASE.replace(/\/$/, "")}/wp-json/wc/v3/orders?customer=${loggedInCustomerId}&status=processing,completed&per_page=100&after=${encodeURIComponent(twelveMonthsAgo.toISOString())}`,
            { headers: { Authorization: auth }, cache: "no-store" },
          );
          const ordersForCalc = oRes.ok ? await oRes.json() : [];
          const ordersLite = mapWcOrdersToLite(ordersForCalc || []);
          const membership = computeMembership(
            ordersLite,
            customer.meta_data || [],
          );
          serverMemberDiscount = calcMemberDiscountAmount(
            regularSubtotal,
            membership.tierId,
            membership.exclusiveActive,
          );
        }
      } catch (e) {
        console.error("member discount verify error:", e);
      }
    }

    if (Math.abs(claimedMemberDiscount - serverMemberDiscount) > 1) {
      console.error(
        `[資安攔截] 會員折扣不符！前端:${claimedMemberDiscount} / 後端:${serverMemberDiscount}`,
      );
      return NextResponse.json(
        { ok: false, message: "會員折扣驗證失敗，請重新整理頁面。" },
        { status: 403 },
      );
    }

    const subtotalAfterMember = Math.max(0, calculatedSubtotal - serverMemberDiscount);
    let serverCouponDiscount = 0;
    let validatedCouponCode: string | null = null;

    const hasSaleItems = items.some((it) => Boolean(it.onSale));
    if (coupon?.code && auth) {
      const validated = await validateCouponOnServer(
        auth,
        coupon.code,
        contact?.email || session?.user?.email || "",
        subtotalAfterMember,
        serverMemberDiscount > 0,
        hasSaleItems,
        Number(loggedInCustomerId) || 0,
      );
      if (!validated) {
        return NextResponse.json(
          { ok: false, message: "折扣碼驗證失敗，請重新輸入。" },
          { status: 403 },
        );
      }
      serverCouponDiscount = validated.amount;
      validatedCouponCode = validated.code;
      if (Math.abs(claimedCouponDiscount - serverCouponDiscount) > 1) {
        claimedCouponDiscount = serverCouponDiscount;
      }
    }

    const totalDiscount = serverMemberDiscount + serverCouponDiscount;
    const discountedSubtotal = Math.max(0, calculatedSubtotal - totalDiscount);

    const shippingSettings = await fetchShippingSettings({ cache: "no-store" });
    const realShippingCost = shippingFeeFor(
      discountedSubtotal,
      shipMethod,
      shippingSettings,
    );

    const secureTotalAmount = discountedSubtotal + realShippingCost;

    // 比對前端傳來的總金額是否與後端算出來的一致 (容許1元誤差)
    if (Math.abs(secureTotalAmount - Number(total)) > 1) {
      console.error(`[資安攔截] 數學驗算不符！前端金額:${total} / 後端計算金額:${secureTotalAmount}`);
      return NextResponse.json({ ok: false, message: "訂單金額驗證失敗，請重新整理頁面。" }, { status: 403 });
    }
    // ============================================================================

    let safeLastName = (addr.lastName || "").replace(/\s+/g, "");
    let safeFirstName = (addr.firstName || "").replace(/\s+/g, "");
    // RY 會把 last_name + first_name 接成收件人姓名；單欄姓名勿重複寫進兩個欄位
    if (safeLastName && safeFirstName && safeLastName === safeFirstName) {
      safeFirstName = "";
    }
    const safePhone = (addr.phone || "").replace(/\s+/g, "");

    if (!loggedInCustomerId && contact?.email && auth && BASE) {
      try {
        const cRes = await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/customers?email=${encodeURIComponent(contact.email.trim())}&role=all`, {
          headers: { Authorization: auth },
          cache: "no-store"
        });
        if (cRes.ok) {
          const cArr = await cRes.json();
          if (Array.isArray(cArr) && cArr.length > 0) loggedInCustomerId = cArr[0].id;
        }
      } catch (e) {}
    }

    const cleanItemName = (
      items
        ?.map((it) =>
          String(it.title || it.name || "")
            .replace(/[#&<>'"%\\]/g, "")
            .trim(),
        )
        .filter(Boolean)
        .join("#")
        .slice(0, 200) || "HOVER商品"
    );
    const tradeNo = `H${Date.now()}`;
    let orderId: string | number = tradeNo;
    
    if (auth && BASE) {
      try {
        const meta_data: any[] = [
          { key: "_ecpay_trade_no", value: tradeNo },
          { key: "_shipping_phone", value: safePhone },
          ...invoiceMetaEntries(invoicePref),
        ];

        let finalAddress = addr.line1;
        let methodId = "ry_ecpay_shipping_home_tcat"; 
        let shippingTitle = "宅配";

        const isCVS = ["CVS", "711", "HILIFE", "OKMART", "FAMI"].includes(shipMethod) && !!addr.storeId;

        if (isCVS) {
          let finalStoreId = String(addr.storeId);
          const sName = addr.storeName || "";
          
          if (shipMethod === "711" || sName.includes("7-11") || sName.includes("統一")) {
            methodId = "ry_ecpay_shipping_cvs_711"; 
            shippingTitle = "7-11超商僅取貨";
            finalStoreId = finalStoreId.padStart(6, '0');
          } else if (shipMethod === "HILIFE" || sName.includes("萊爾富")) {
            methodId = "ry_ecpay_shipping_cvs_hilife"; 
            shippingTitle = "萊爾富超商僅取貨";
            if (finalStoreId.length > 4 && finalStoreId.startsWith("00")) finalStoreId = finalStoreId.replace(/^0+/, ''); 
          } else if (shipMethod === "OKMART" || sName.includes("OK") || sName.toUpperCase().includes("OKMART")) {
            methodId = "ry_ecpay_shipping_cvs_ok"; 
            shippingTitle = "OK超商僅取貨";
          } else {
            methodId = "ry_ecpay_shipping_cvs_family"; 
            shippingTitle = "全家超商僅取貨";
            finalStoreId = finalStoreId.padStart(6, '0');
          }
          
          finalAddress = `${addr.storeName} (${finalStoreId}) - ${addr.storeAddr}`;
          
          meta_data.push(
            { key: "_shipping_cvs_store_ID", value: finalStoreId },
            { key: "_shipping_cvs_store_name", value: addr.storeName },
            { key: "_shipping_cvs_store_address", value: addr.storeAddr },
            { key: "_shipping_cvs_store_telephone", value: safePhone }
          );
        }

        if (validatedCouponCode) meta_data.push({ key: "_used_coupon_code", value: validatedCouponCode });

        const fee_lines: { name: string; total: string }[] = [];
        if (serverMemberDiscount > 0) {
          fee_lines.push({
            name: "HOVER 臻享會員 95 折",
            total: String(-serverMemberDiscount),
          });
        }
        // 以 fee_line 套用站內已驗算的折扣碼金額，避免 WC coupon_lines 依原價重算與會員折疊加不一致
        if (serverCouponDiscount > 0 && validatedCouponCode) {
          fee_lines.push({
            name: `折扣碼 ${validatedCouponCode}`,
            total: String(-serverCouponDiscount),
          });
        }

        const wcOrderPayload: Record<string, unknown> = {
          customer_id: loggedInCustomerId, 
          payment_method: payMethod === "linepay" ? "linepay" : payMethod === "atm" ? "ecpay_atm" : "ecpay",
          payment_method_title:
            payMethod === "linepay"
              ? "LINE Pay"
              : payMethod === "atm"
                ? "ATM 虛擬帳號"
                : "信用卡",
          set_paid: false,
          status: "pending", 
          billing: {
            first_name: safeFirstName, last_name: safeLastName,
            address_1: finalAddress, city: "Taipei", country: "TW",
            email: contact.email, phone: safePhone,
          },
          shipping: {
            first_name: safeFirstName, last_name: safeLastName,
            address_1: finalAddress, country: "TW",
            phone: safePhone,
          },
          shipping_lines: [{ method_id: methodId, method_title: shippingTitle, total: String(realShippingCost) }],
          fee_lines,
          line_items: items.map((it) => {
            const unit = toTwdInt(it.price);
            const qty = Math.max(1, Math.round(Number(it.qty) || 0));
            const line = unit * qty;
            return {
              product_id: Number(it.wcProductId || it.id),
              ...(it.wcVariationId
                ? { variation_id: Number(it.wcVariationId) }
                : {}),
              quantity: qty,
              // 鎖定站內購物車單價，與綠界／發票金額一致
              subtotal: String(line),
              total: String(line),
            };
          }),
          meta_data,
        };

        // 不傳 coupon_lines：折抵已由 fee_line 精確寫入；用量於建立成功後 bump
        const wcRes = await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/orders`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify(wcOrderPayload),
        });
        const wcData = await wcRes.json();
        if (!wcRes.ok) {
          const wcMsg = String(
            wcData?.message || wcData?.code || "建立訂單失敗",
          );
          const looksLikeStock =
            /stock|inventory|庫存|out of stock|insufficient/i.test(wcMsg) ||
            /out_of_stock|insufficient_stock/i.test(String(wcData?.code || ""));
          return NextResponse.json(
            {
              ok: false,
              message: looksLikeStock
                ? "庫存不足，請調整購物車數量後再試"
                : wcMsg,
            },
            { status: looksLikeStock ? 409 : 400 },
          );
        }
        if (wcData.id) {
          orderId = wcData.id;
          if (validatedCouponCode) {
            await bumpCouponUsage(
              auth,
              validatedCouponCode,
              contact?.email || session?.user?.email || "",
            );
            if (loggedInCustomerId) {
              await markMasterCouponUsed(
                auth,
                Number(loggedInCustomerId),
                validatedCouponCode,
              );
            }
          }
          // 再對齊一次：WC 總額應等於站內 secureTotal（綠界／發票同源）
          const wcTotal = Math.round(Number(wcData.total) || 0);
          const expected = Math.round(Number(secureTotalAmount));
          if (Number.isFinite(wcTotal) && Math.abs(wcTotal - expected) > 1) {
            const delta = expected - wcTotal;
            console.warn(
              `[checkout] WC total reconcile #${orderId}: wc=${wcTotal} expected=${expected} delta=${delta}`,
            );
            await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/orders/${orderId}`, {
              method: "PUT",
              headers: { Authorization: auth, "Content-Type": "application/json" },
              body: JSON.stringify({
                fee_lines: [
                  ...(Array.isArray(wcData.fee_lines)
                    ? wcData.fee_lines.map((f: any) => ({
                        id: f.id,
                        name: f.name,
                        total: f.total,
                      }))
                    : []),
                  { name: "優惠金額校正", total: String(delta) },
                ],
                meta_data: [
                  { key: "_hover_secure_total", value: String(expected) },
                ],
              }),
            });
          }
        }
      } catch (wcErr) {
        console.error("WC 訂單建立失敗", wcErr);
      }
    }

    const amountInt = Math.round(Number(secureTotalAmount));
    if (!Number.isFinite(amountInt) || amountInt < 1) {
      return NextResponse.json({ ok: false, message: "訂單金額異常" }, { status: 400 });
    }
    const finalGatewayAmount = String(amountInt); 
    const domain = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; 

    if (payMethod === "linepay") {
      if (!LINEPAY_CHANNEL_ID || !LINEPAY_CHANNEL_SECRET) {
        return NextResponse.json({ ok: false, message: "LINE Pay 金鑰未設定" }, { status: 500 });
      }

      const nonce = crypto.randomUUID();
      const uri = "/v3/payments/request";
      const lpPayload = {
        amount: Number(finalGatewayAmount),
        currency: "TWD",
        orderId: tradeNo,
        packages: [
          {
            id: `PKG_${orderId}`,
            amount: Number(finalGatewayAmount),
            name: "HOVER 訂單",
            products: [
              {
                id: "ORDER_TOTAL",
                name: "HOVER 官方商城訂單總計",
                quantity: 1,
                price: Number(finalGatewayAmount) 
              }
            ]
          }
        ],
        redirectUrls: {
          confirmUrl: `${domain}/api/linepay/confirm?orderId=${orderId}&tradeNo=${tradeNo}&amount=${finalGatewayAmount}`, 
          cancelUrl: `${domain}/cart` 
        }
      };

      const payloadString = JSON.stringify(lpPayload);
      const signature = generateLinePaySignature(uri, payloadString, nonce);

      const lpRes = await fetch(`${LINEPAY_BASE_URL}${uri}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
          "X-LINE-Authorization-Nonce": nonce,
          "X-LINE-Authorization": signature,
        },
        body: payloadString
      });

      const lpData = await lpRes.json();

      if (lpData.returnCode === "0000" && lpData.info.paymentUrl.web) {
        return NextResponse.json({ ok: true, orderId, redirectUrl: lpData.info.paymentUrl.web });
      } else {
        return NextResponse.json({ ok: false, message: lpData.returnMessage || "LINE Pay 請求失敗" }, { status: 400 });
      }

    } else {
      const choosePayment = resolveEcpayChoosePayment(payMethod);
      if (!choosePayment) {
        return NextResponse.json(
          { ok: false, message: "不支援的付款方式" },
          { status: 400 },
        );
      }

      if (choosePayment === "ATM" && (amountInt < 16 || amountInt > 49999)) {
        return NextResponse.json(
          { ok: false, message: "ATM 轉帳金額需為 16～49,999 元" },
          { status: 400 },
        );
      }

      const ecpayParams: Record<string, string> = {
        MerchantID: MERCHANT_ID,
        MerchantTradeNo: tradeNo,
        MerchantTradeDate: getEcpayDate(),
        PaymentType: "aio",
        TotalAmount: finalGatewayAmount,
        TradeDesc: "HOVER Shop",
        ItemName: cleanItemName,
        ReturnURL: `${domain}/api/ecpay/callback`,
        PaymentInfoURL: `${domain}/api/ecpay/callback`,
        ClientBackURL: `${domain}/thank-you?orderId=${orderId}`,
        ChoosePayment: choosePayment,
        EncryptType: "1",
        CustomField1: String(orderId),
        CustomField2: String(contact.email || "").slice(0, 50),
        CustomField3: finalGatewayAmount,
      };

      if (choosePayment === "ATM") {
        ecpayParams.ExpireDate = "3";
        ecpayParams.ClientRedirectURL = `${domain}/api/ecpay/atm-return`;
      }

      const ignorePayment = buildEcpayIgnorePayment(choosePayment);
      if (ignorePayment) ecpayParams.IgnorePayment = ignorePayment;

      const checkMacValue = generateCheckMacValue(ecpayParams, HASH_KEY, HASH_IV);

      const htmlForm = `
        <form id="_form_ecpay" action="${escapeHtmlAttr(ECPAY_URL)}" method="POST">
          ${Object.keys(ecpayParams).map((key) => `<input type="hidden" name="${escapeHtmlAttr(key)}" value="${escapeHtmlAttr(ecpayParams[key])}" />`).join("")}
          <input type="hidden" name="CheckMacValue" value="${checkMacValue}" />
        </form>
      `.trim();

      return NextResponse.json({ ok: true, orderId, html: htmlForm });
    }

  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "伺服器發生錯誤" }, { status: 500 });
  }
}