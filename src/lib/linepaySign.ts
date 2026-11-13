import crypto from "crypto";

/**
 * LINE Pay confirmUrl 參數簽章。
 *
 * confirmUrl 是 LINE Pay 付款完成後由「瀏覽器」帶回的網址，orderId／amount 皆可被竄改。
 * 結帳時用伺服器密鑰把 (orderId, tradeNo, amount) 簽起來，confirm 時驗證，
 * 即可確保回來的參數與當初建立付款請求時完全一致。
 */
function signingKey(): string {
  return (
    process.env.LINEPAY_CHANNEL_SECRET ||
    process.env.RESET_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

export function signLinePayConfirm(
  orderId: string | number,
  tradeNo: string,
  amount: string | number,
): string {
  const key = signingKey();
  if (!key) return "";
  return crypto
    .createHmac("sha256", key)
    .update(`linepay-confirm|${orderId}|${tradeNo}|${amount}`)
    .digest("hex");
}

export function verifyLinePayConfirm(
  orderId: string | number,
  tradeNo: string,
  amount: string | number,
  sig: string,
): boolean {
  const expected = signLinePayConfirm(orderId, tradeNo, amount);
  if (!expected || !sig) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
