// lib/ecpay.ts
import crypto from "crypto";

export function getEcpayDate(): string {
  const d = new Date();
  const offset = 8; // UTC+8
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const nd = new Date(utc + 3600000 * offset);
  const year = nd.getFullYear();
  const month = ("0" + (nd.getMonth() + 1)).slice(-2);
  const day = ("0" + nd.getDate()).slice(-2);
  const hour = ("0" + nd.getHours()).slice(-2);
  const min = ("0" + nd.getMinutes()).slice(-2);
  const sec = ("0" + nd.getSeconds()).slice(-2);
  return `${year}/${month}/${day} ${hour}:${min}:${sec}`;
}

export function generateCheckMacValue(params: any, hashKey: string, hashIV: string): string {
  // 1. 排序
  const keys = Object.keys(params).filter((k) => k !== "CheckMacValue").sort();

  // 2. 串接字串
  let rawString = `HashKey=${hashKey}`;
  keys.forEach((k) => {
    rawString += `&${k}=${params[k]}`;
  });
  rawString += `&HashIV=${hashIV}`;

  // 3. URL Encode (關鍵步驟！)
  let encodedString = encodeURIComponent(rawString).toLowerCase();

  // 4. 綠界特殊的取代規則 (.NET 相容性)
  encodedString = encodedString
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%20/g, "+"); // 空白轉 +

  // 5. SHA256 加密並轉大寫
  return crypto.createHash("sha256").update(encodedString).digest("hex").toUpperCase();
}