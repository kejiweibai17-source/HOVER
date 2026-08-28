/**
 * 入會禮 HOVER100 — Email 註冊與社群登入共用
 */
import {
  buildGiftCouponPayload,
  HOVER_MEMBERSHIP_META,
  MEMBERSHIP_RULES,
  welcomeCouponCode,
} from "@/lib/membership";

const BASE = process.env.WC_API_BASE || "";
const CK = process.env.WC_CONSUMER_KEY || "";
const CS = process.env.WC_CONSUMER_SECRET || "";

function hasWooConfig() {
  return Boolean(BASE && CK && CS);
}

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function authHeaders() {
  return {
    Authorization: basicAuth(),
    "Content-Type": "application/json",
  };
}

function hasWelcomeClaimed(
  meta: Array<{ key?: string; value?: unknown }> | undefined,
): boolean {
  if (!Array.isArray(meta)) return false;
  return meta.some(
    (m) =>
      m.key === HOVER_MEMBERSHIP_META.welcomeClaimed &&
      String(m.value) === "1",
  );
}

export type WelcomeGiftResult = {
  granted: boolean;
  already: boolean;
  code: string;
};

/**
 * 若該會員尚未領過入會禮，建立 HOVER100 優惠券並標記 hover_welcome_claimed。
 * 同一 customerId / email 只會發一次。
 */
export async function grantWelcomeGiftIfEligible(
  customerId: number,
  email: string,
  existingMeta?: Array<{ key?: string; value?: unknown }>,
): Promise<WelcomeGiftResult> {
  const code = welcomeCouponCode(customerId);
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!hasWooConfig() || !customerId || !normalizedEmail) {
    return { granted: false, already: false, code };
  }

  if (hasWelcomeClaimed(existingMeta)) {
    return { granted: false, already: true, code };
  }

  const headers = authHeaders();

  if (!existingMeta) {
    const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      headers: { Authorization: basicAuth() },
      cache: "no-store",
    });
    if (uRes.ok) {
      const user = await uRes.json().catch(() => ({}));
      const meta = Array.isArray(user?.meta_data) ? user.meta_data : [];
      if (hasWelcomeClaimed(meta)) {
        return { granted: false, already: true, code };
      }
    }
  }

  const existRes = await fetch(
    `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
    { headers: { Authorization: basicAuth() }, cache: "no-store" },
  );
  const existArr = await existRes.json().catch(() => []);
  const couponExists = Array.isArray(existArr) && existArr.length > 0;

  if (!couponExists) {
    const createRes = await fetch(`${BASE}/wp-json/wc/v3/coupons`, {
      method: "POST",
      headers,
      body: JSON.stringify(
        buildGiftCouponPayload({
          code,
          amount: MEMBERSHIP_RULES.welcomeGift,
          email: normalizedEmail,
          description:
            "HOVER FRIENDS 入會禮 HOVER100（單筆滿 NT$1,000 可使用，限本人一次）",
          expiryDays: MEMBERSHIP_RULES.giftValidityDays,
          kind: "welcome",
        }),
      ),
    });
    if (!createRes.ok) {
      const err = await createRes.text().catch(() => "");
      throw new Error(`create welcome coupon failed: ${err}`);
    }
  }

  await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      meta_data: [
        { key: HOVER_MEMBERSHIP_META.welcomeClaimed, value: "1" },
      ],
    }),
  });

  return { granted: !couponExists, already: couponExists, code };
}
