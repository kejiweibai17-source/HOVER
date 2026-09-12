import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { authOptions } from "@/lib/auth-options";

const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "secret";

export type MemberSession = {
  email: string;
  customerId: number;
};

function readAuthToken(): MemberSession | null {
  const token = cookies().get("auth_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      email?: string;
      id?: number | string;
    };
    const email = String(decoded?.email || "").trim();
    const customerId = Number(decoded?.id || 0);
    if (!email && !customerId) return null;
    return { email, customerId: Number.isFinite(customerId) ? customerId : 0 };
  } catch {
    return null;
  }
}

/** 已登入會員（Google NextAuth 或 email／LINE／Facebook auth_token）。不含訪客信箱 cookie。 */
export async function getMemberSession(): Promise<MemberSession | null> {
  const authMethod = String(
    cookies().get("hover_auth_method")?.value || "",
  ).toLowerCase();

  if (authMethod === "line" || authMethod === "facebook" || authMethod === "email") {
    return readAuthToken();
  }

  const session = await getServerSession(authOptions);
  const email = String(session?.user?.email || "").trim();
  const customerId = Number((session as { customerId?: number })?.customerId || 0);
  if (email || customerId) {
    return { email, customerId: Number.isFinite(customerId) ? customerId : 0 };
  }

  if (authMethod === "google") return null;
  return readAuthToken();
}
