/**
 * 綠界環境切換（金流／物流地圖／發票）
 *
 * 在 .env.local 設：
 *   ECPAY_ENV=stage|production
 *   NEXT_PUBLIC_ECPAY_ENV=stage|production  （前端選店地圖用，須與上面一致）
 *
 * 兩組金鑰並存：
 *   ECPAY_STAGE_* / ECPAY_PROD_*
 * 未設 PREFIX 時退回舊變數 ECPAY_MERCHANT_ID 等。
 */

export type EcpayMode = "stage" | "production";

function pick(...values: Array<string | undefined | null>): string {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

export function getEcpayMode(): EcpayMode {
  const raw = pick(
    process.env.ECPAY_ENV,
    process.env.NEXT_PUBLIC_ECPAY_ENV,
  ).toLowerCase();
  if (raw === "production" || raw === "prod" || raw === "live") {
    return "production";
  }
  return "stage";
}

export function isEcpayStage(): boolean {
  return getEcpayMode() === "stage";
}

/** 金流 MerchantID / HashKey / HashIV */
export function getEcpayPaymentCredentials() {
  const mode = getEcpayMode();
  if (mode === "production") {
    return {
      mode,
      merchantId: pick(
        process.env.ECPAY_PROD_MERCHANT_ID,
        process.env.ECPAY_MERCHANT_ID,
      ),
      hashKey: pick(process.env.ECPAY_PROD_HASH_KEY, process.env.ECPAY_HASH_KEY),
      hashIv: pick(process.env.ECPAY_PROD_HASH_IV, process.env.ECPAY_HASH_IV),
    };
  }
  return {
    mode,
    merchantId: pick(
      process.env.ECPAY_STAGE_MERCHANT_ID,
      process.env.ECPAY_MERCHANT_ID,
    ),
    hashKey: pick(process.env.ECPAY_STAGE_HASH_KEY, process.env.ECPAY_HASH_KEY),
    hashIv: pick(process.env.ECPAY_STAGE_HASH_IV, process.env.ECPAY_HASH_IV),
  };
}

/** 電子發票（可與金流不同組；未設則跟金流） */
export function getEcpayInvoiceCredentials() {
  const invEnv = pick(
    process.env.ECPAY_INVOICE_ENV,
    process.env.ECPAY_ENV,
    process.env.NEXT_PUBLIC_ECPAY_ENV,
  ).toLowerCase();
  const mode: EcpayMode =
    invEnv === "production" || invEnv === "prod" || invEnv === "live"
      ? "production"
      : "stage";

  const payment = getEcpayPaymentCredentials();

  if (mode === "production") {
    // 正式環境只用 PROD_*；勿吃未加前綴的 ECPAY_INVOICE_*（常殘留測試 2000132）
    return {
      mode,
      merchantId: pick(
        process.env.ECPAY_PROD_INVOICE_MERCHANT_ID,
        process.env.ECPAY_PROD_MERCHANT_ID,
        payment.merchantId,
      ),
      hashKey: pick(
        process.env.ECPAY_PROD_INVOICE_HASH_KEY,
        process.env.ECPAY_PROD_HASH_KEY,
        payment.hashKey,
      ),
      hashIv: pick(
        process.env.ECPAY_PROD_INVOICE_HASH_IV,
        process.env.ECPAY_PROD_HASH_IV,
        payment.hashIv,
      ),
    };
  }

  return {
    mode,
    merchantId: pick(
      process.env.ECPAY_STAGE_INVOICE_MERCHANT_ID,
      process.env.ECPAY_INVOICE_MERCHANT_ID,
      process.env.ECPAY_STAGE_MERCHANT_ID,
      payment.merchantId,
    ),
    hashKey: pick(
      process.env.ECPAY_STAGE_INVOICE_HASH_KEY,
      process.env.ECPAY_INVOICE_HASH_KEY,
      process.env.ECPAY_STAGE_HASH_KEY,
      payment.hashKey,
    ),
    hashIv: pick(
      process.env.ECPAY_STAGE_INVOICE_HASH_IV,
      process.env.ECPAY_INVOICE_HASH_IV,
      process.env.ECPAY_STAGE_HASH_IV,
      payment.hashIv,
    ),
  };
}

export function getEcpayPaymentCheckoutUrl(): string {
  const explicit = pick(process.env.ECPAY_API_URL);
  if (explicit) return explicit;
  return isEcpayStage()
    ? "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
    : "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";
}

export function getEcpayLogisticsMapUrl(): string {
  return isEcpayStage()
    ? "https://logistics-stage.ecpay.com.tw/Express/map"
    : "https://logistics.ecpay.com.tw/Express/map";
}

/**
 * 超商地圖用的 MerchantID（C2C 測試常用 2000933；正式通常與商店同一組）
 * Client 也可呼叫（只讀 NEXT_PUBLIC_*）
 */
export function getEcpayLogisticsMerchantId(): string {
  const mode = getEcpayMode();
  if (mode === "production") {
    return pick(
      process.env.NEXT_PUBLIC_ECPAY_PROD_MERCHANT_ID,
      process.env.ECPAY_PROD_LOGISTICS_MERCHANT_ID,
      process.env.ECPAY_PROD_MERCHANT_ID,
      process.env.NEXT_PUBLIC_ECPAY_MERCHANT_ID,
      process.env.ECPAY_MERCHANT_ID,
    );
  }
  return pick(
    process.env.NEXT_PUBLIC_ECPAY_STAGE_MERCHANT_ID,
    process.env.ECPAY_STAGE_LOGISTICS_MERCHANT_ID,
    process.env.ECPAY_STAGE_MERCHANT_ID,
    process.env.NEXT_PUBLIC_ECPAY_MERCHANT_ID,
    process.env.ECPAY_MERCHANT_ID,
  );
}

export function assertEcpayPaymentConfigured(): string | null {
  const { merchantId, hashKey, hashIv, mode } = getEcpayPaymentCredentials();
  if (!merchantId || !hashKey || !hashIv) {
    return `綠界金流金鑰未設定（目前 ECPAY_ENV=${mode}）`;
  }
  // 避免誤把測試商店當正式
  if (
    mode === "production" &&
    (merchantId === "2000132" || merchantId === "2000933")
  ) {
    return "ECPAY_ENV=production 但 MerchantID 仍是綠界測試商店，請填入正式商店代號";
  }
  // 綠界 AIO CheckMac 金鑰長度固定 16；長度不對會直接 CheckMacValue Error
  if (hashKey.length !== 16 || hashIv.length !== 16) {
    return `綠界 HashKey／HashIV 長度須各為 16（目前 Key=${hashKey.length}、IV=${hashIv.length}，ECPAY_ENV=${mode}）`;
  }
  return null;
}
