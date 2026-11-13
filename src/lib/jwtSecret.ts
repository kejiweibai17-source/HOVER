/**
 * 簽發／驗證 auth_token 等 JWT 的共用密鑰。
 *
 * - 優先順序與登入 API 相同：RESET_TOKEN_SECRET → NEXTAUTH_SECRET → JWT_SECRET
 * - 開發環境仍保留舊的 "secret" 後備，不影響本機開發
 * - 正式環境若三者皆未設定，回傳空字串 → jwt.sign / jwt.verify 會直接失敗（fail closed），
 *   避免任何人用公開字串 "secret" 偽造登入 token
 */
export const JWT_SECRET: string =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "secret");
