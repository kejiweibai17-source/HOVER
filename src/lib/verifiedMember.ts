import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { authOptions } from "@/lib/auth-options";
import { JWT_SECRET } from "@/lib/jwtSecret";

/**
 * 「已驗證」會員身分：只信任「有簽章」的憑證
 *  - auth_token（JWT，LINE／Facebook／Email 登入）
 *  - NextAuth session（Google 登入）
 *  - WordPress JWT（jwt cookie → /wp/v2/users/me）
 *
 * ⚠️ 絕對不要信任未簽名的 `user_email` cookie —— 任何人都能自行帶上別人的 email。
 */
export type VerifiedMember = {
  email: string | null; // 已轉小寫
  customerId: number | null;
};

type AuthTokenPayload = { email?: string; id?: number | string };

function readAuthToken(): { email: string | null; customerId: number | null } | null {
  const token = cookies().get("auth_token")?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    const email = String(decoded?.email || "").trim().toLowerCase();
    const id = Number(decoded?.id || 0);
    if (!email && !id) return null;
    return {
      email: email || null,
      customerId: Number.isFinite(id) && id > 0 ? id : null,
    };
  } catch {
    return null;
  }
}

async function readWpJwtIdentity(): Promise<{
  email: string | null;
  wpUserId: number | null;
} | null> {
  const wpJwt = cookies().get("jwt")?.value;
  if (!wpJwt) return null;
  const base = (process.env.WC_API_BASE || "").replace(/\/$/, "");
  if (!base) return null;
  try {
    const meRes = await fetch(`${base}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${wpJwt}` },
      cache: "no-store",
    });
    if (!meRes.ok) return null;
    const me = await meRes.json();
    const email = String(me?.email || "").trim().toLowerCase();
    const wpUserId = typeof me?.id === "number" ? me.id : null;
    return { email: email || null, wpUserId };
  } catch {
    return null;
  }
}

export async function getVerifiedMember(): Promise<VerifiedMember> {
  const cookieStore = cookies();
  const authMethod = String(
    cookieStore.get("hover_auth_method")?.value || "",
  ).toLowerCase();

  let email: string | null = null;
  let customerId: number | null = null;

  // 單一作用中登入方式：LINE／FB／email 優先看 auth_token；Google 優先看 NextAuth
  if (authMethod === "line" || authMethod === "facebook" || authMethod === "email") {
    const t = readAuthToken();
    if (t) {
      email = t.email;
      customerId = t.customerId;
    }
  }

  if (!email) {
    const session = await getServerSession(authOptions);
    const sessionEmail = String(session?.user?.email || "").trim().toLowerCase();
    if (sessionEmail) {
      email = sessionEmail;
      const sid = Number((session as { customerId?: number } | null)?.customerId || 0);
      if (Number.isFinite(sid) && sid > 0) customerId = sid;
    }
  }

  if (!email && authMethod !== "google") {
    const t = readAuthToken();
    if (t) {
      email = t.email;
      customerId = customerId || t.customerId;
    }
  }

  if (!email) {
    const wp = await readWpJwtIdentity();
    if (wp) {
      email = wp.email;
      if (!customerId && wp.wpUserId) customerId = wp.wpUserId;
    }
  }

  return { email, customerId };
}

export async function getVerifiedMemberEmail(): Promise<string | null> {
  return (await getVerifiedMember()).email;
}

export function parseAdminEmails(): string[] {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** 以「已驗證」身分判斷是否為管理員（ADMIN_EMAILS 白名單）。 */
export async function isVerifiedAdmin(): Promise<boolean> {
  const email = await getVerifiedMemberEmail();
  if (!email) return false;
  return parseAdminEmails().includes(email);
}
