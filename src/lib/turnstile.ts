/**
 * Cloudflare Turnstile 驗證
 * 未設定 NEXT_PUBLIC_TURNSTILE_SITE_KEY 時略過（方便本機開發）
 */

export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      process.env.TURNSTILE_SECRET_KEY,
  );
}

export function turnstileSiteKey(): string {
  return String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  ip?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTurnstileConfigured()) {
    return { ok: true };
  }

  const t = String(token || "").trim();
  if (!t) {
    return { ok: false, message: "請完成人機驗證" };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", String(process.env.TURNSTILE_SECRET_KEY || ""));
    body.set("response", t);
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (!data?.success) {
      return { ok: false, message: "人機驗證失敗，請再試一次" };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "人機驗證服務暫時無法使用，請稍後再試" };
  }
}
