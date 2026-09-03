/**
 * 入會禮 HOVER100 — 固定母券 + meta 標記已領 + 寄送入會禮信
 */
import {
  HOVER_MEMBERSHIP_META,
  MEMBERSHIP_RULES,
} from "@/lib/membership";
import {
  buildMasterCouponMetaUpdates,
  expiresAtFromClaimAt,
  welcomeCouponCode,
} from "@/lib/masterCoupons";
import { sendWelcomeGiftMail } from "@/lib/membershipGiftMails";

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
 * 若該會員尚未領過入會禮，標記 meta 並寄「歡迎加入 HOVER FRIENDS」信。
 */
export async function grantWelcomeGiftIfEligible(
  customerId: number,
  email: string,
  existingMeta?: Array<{ key?: string; value?: unknown }>,
  memberName?: string,
): Promise<WelcomeGiftResult> {
  const code = welcomeCouponCode();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!hasWooConfig() || !customerId || !normalizedEmail) {
    return { granted: false, already: false, code };
  }

  if (hasWelcomeClaimed(existingMeta)) {
    const updates = buildMasterCouponMetaUpdates(code, existingMeta || []);
    if (updates.length && hasWooConfig()) {
      await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ meta_data: updates }),
      });
    }
    return { granted: false, already: true, code };
  }

  const headers = authHeaders();
  let meta = existingMeta;
  let resolvedName = String(memberName || "").trim();

  if (!meta) {
    const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      headers: { Authorization: basicAuth() },
      cache: "no-store",
    });
    if (uRes.ok) {
      const user = await uRes.json().catch(() => ({}));
      meta = Array.isArray(user?.meta_data) ? user.meta_data : [];
      if (!resolvedName) {
        const fn = String(user?.first_name || "").trim();
        const ln = String(user?.last_name || "").trim();
        resolvedName = `${fn} ${ln}`.trim();
      }
      if (hasWelcomeClaimed(meta)) {
        return { granted: false, already: true, code };
      }
    } else {
      meta = [];
    }
  }

  const updates = buildMasterCouponMetaUpdates(code, meta || []);
  if (!updates.length) {
    return { granted: false, already: true, code };
  }

  const claimedAt = new Date().toISOString();
  await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ meta_data: updates }),
  });

  try {
    await sendWelcomeGiftMail({
      customerEmail: normalizedEmail,
      memberName: resolvedName || undefined,
      expiresAt: expiresAtFromClaimAt(
        claimedAt,
        MEMBERSHIP_RULES.giftValidityDays,
      ),
    });
  } catch (e) {
    console.error("[welcomeGift] mail failed:", e);
  }

  return { granted: true, already: false, code };
}
