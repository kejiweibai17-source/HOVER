import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE = (process.env.WC_API_BASE || "").replace(/\/$/, "");
const KEY = process.env.WC_CONSUMER_KEY || "";
const SECRET = process.env.WC_CONSUMER_SECRET || "";
const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "secret";

function noCacheHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  };
}

function basicAuth() {
  if (!KEY || !SECRET) return "";
  return "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64");
}

import { isOrderCustomerCancellable, type OrderLike } from "@/lib/orderActions";

function canCustomerCancel(order: any): boolean {
  const payload: OrderLike = {
    status: order?.status,
    date_paid: order?.date_paid ?? null,
    meta_data: order?.meta_data,
    logistics_phase: order?.meta_data?.find(
      (m: { key?: string; value?: unknown }) => m?.key === "_hel_LogisticsPhase",
    )?.value as string | undefined,
    return_status: order?.meta_data?.find(
      (m: { key?: string; value?: unknown }) =>
        m?.key === "_hover_return_status",
    )?.value as string | undefined,
  };
  return isOrderCustomerCancellable(payload);
}

async function resolveMemberIdentity(): Promise<{
  email: string | null;
  wpUserId: number | null;
}> {
  const cookieStore = cookies();
  const session = await getServerSession(authOptions);
  const authMethod = String(
    cookieStore.get("hover_auth_method")?.value || "",
  ).toLowerCase();

  let email: string | null = null;
  const readAuthTokenEmail = () => {
    const authToken = cookieStore.get("auth_token")?.value;
    if (!authToken) return null;
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET) as any;
      return decoded?.email ? String(decoded.email) : null;
    } catch {
      return null;
    }
  };

  if (authMethod === "line" || authMethod === "facebook" || authMethod === "email") {
    email = readAuthTokenEmail();
  }
  if (!email) email = session?.user?.email || null;
  if (!email) email = cookieStore.get("user_email")?.value || null;
  if (!email) email = readAuthTokenEmail();

  let wpUserId: number | null = null;
  const wpJwt = cookieStore.get("jwt")?.value;
  if (wpJwt) {
    try {
      const meRes = await fetch(`${BASE}/wp-json/wp/v2/users/me`, {
        headers: {
          Authorization: `Bearer ${wpJwt}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      if (meRes.ok) {
        const me = await meRes.json();
        wpUserId = typeof me?.id === "number" ? me.id : null;
        if (!email && me?.email) email = me.email;
      }
    } catch {
      // ignore
    }
  }

  return {
    email: email ? email.trim().toLowerCase() : null,
    wpUserId,
  };
}

/**
 * POST /api/account/orders/:id/cancel
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = basicAuth();
    if (!BASE || !auth) {
      return NextResponse.json(
        { ok: false, message: "伺服器未設定 WooCommerce API" },
        { status: 500, headers: noCacheHeaders() },
      );
    }

    const { email, wpUserId } = await resolveMemberIdentity();
    if (!email && !wpUserId) {
      return NextResponse.json(
        { ok: false, message: "請先登入" },
        { status: 401, headers: noCacheHeaders() },
      );
    }

    const orderId = Number(params.id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json(
        { ok: false, message: "訂單編號無效" },
        { status: 400, headers: noCacheHeaders() },
      );
    }

    const orderRes = await fetch(`${BASE}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!orderRes.ok) {
      return NextResponse.json(
        { ok: false, message: "找不到訂單" },
        { status: 404, headers: noCacheHeaders() },
      );
    }
    const order = await orderRes.json();
    const customerId = Number(order?.customer_id || 0);
    const billingEmail = String(order?.billing?.email || "")
      .trim()
      .toLowerCase();
    const owned =
      (wpUserId && customerId > 0 && customerId === wpUserId) ||
      (email && billingEmail && email === billingEmail);

    if (!owned) {
      return NextResponse.json(
        { ok: false, message: "無權操作此訂單" },
        { status: 403, headers: noCacheHeaders() },
      );
    }

    if (!canCustomerCancel(order)) {
      return NextResponse.json(
        { ok: false, message: "此訂單目前無法取消（僅待付款訂單可自行取消）" },
        { status: 400, headers: noCacheHeaders() },
      );
    }

    const cancelRes = await fetch(`${BASE}/wp-json/wc/v3/orders/${orderId}`, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "cancelled",
        meta_data: [
          { key: "_hover_cancelled_by", value: "customer" },
          { key: "_hover_cancelled_at", value: new Date().toISOString() },
        ],
      }),
      cache: "no-store",
    });

    if (!cancelRes.ok) {
      const errText = await cancelRes.text();
      return NextResponse.json(
        { ok: false, message: "取消失敗", detail: errText.slice(0, 300) },
        { status: 502, headers: noCacheHeaders() },
      );
    }

    const updated = await cancelRes.json();
    return NextResponse.json(
      {
        ok: true,
        order: {
          id: updated.id,
          number: updated.number,
          status: updated.status,
        },
      },
      { headers: noCacheHeaders() },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "取消訂單失敗" },
      { status: 500, headers: noCacheHeaders() },
    );
  }
}
