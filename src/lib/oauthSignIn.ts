/**
 * Direct NextAuth OAuth sign-in via form POST.
 * Avoids next-auth/react signIn() which calls getProviders() first —
 * when that fetch fails, it redirects to /api/auth/error → login?error=undefined.
 */
export async function oauthSignIn(
  provider: "google" | "facebook",
  callbackUrl: string,
): Promise<void> {
  const csrfRes = await fetch("/api/auth/csrf", {
    credentials: "include",
    cache: "no-store",
  });
  if (!csrfRes.ok) {
    throw new Error("無法取得 CSRF token，請重新整理頁面後再試。");
  }

  const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfToken) {
    throw new Error("登入初始化失敗，請重新整理頁面後再試。");
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/auth/signin/${provider}`;
  form.style.display = "none";

  for (const [name, value] of [
    ["csrfToken", csrfToken],
    ["callbackUrl", callbackUrl],
  ] as const) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
