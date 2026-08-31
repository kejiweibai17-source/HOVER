import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SOCIAL_PENDING_COOKIE,
  verifySocialPending,
} from "@/lib/socialLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get(SOCIAL_PENDING_COOKIE)?.value || "";
  const pending = token ? verifySocialPending(token) : null;
  if (!pending) {
    return NextResponse.json(
      { ok: false, pending: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const providerLabel =
    pending.provider === "google"
      ? "Google"
      : pending.provider === "facebook"
        ? "Facebook"
        : "LINE";

  return NextResponse.json(
    {
      ok: true,
      pending: true,
      provider: pending.provider,
      providerLabel,
      email: pending.email || "",
      name: pending.name || "",
      next: pending.next || "/account",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
