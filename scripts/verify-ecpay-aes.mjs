import crypto from "crypto";

const HashKey = "ejCk326UnaZWKisg";
const HashIV  = "q9jcZX8Ib9LM8wYk";
const plainJson = `{"Name":"Test","ID":"A123456789"}`;

function aesEncryptToBase64(plain, key, iv) {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  cipher.setAutoPadding(true);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return enc.toString("base64");
}

// 產生「encodeURIComponent」版本（%XX 會是大寫）
function urlEncodeUpper(str) {
  return encodeURIComponent(str);
}

// 產生「%XX 小寫」版本（只把 %AB 這種變成 %ab）
function urlEncodeLower(str) {
  return encodeURIComponent(str).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase());
}

const upper = urlEncodeUpper(plainJson);
const lower = urlEncodeLower(plainJson);

console.log("upper urlencode =", upper);
console.log("lower urlencode =", lower);

const encUpper = aesEncryptToBase64(upper, HashKey, HashIV);
const encLower = aesEncryptToBase64(lower, HashKey, HashIV);

console.log("\nAES(base64) upper =", encUpper);
console.log("AES(base64) lower =", encLower);

console.log("\nExpected upper = uvI4yrErM37XNQkXGAgRgJAgHn2t72jahaMZzYhWL1HmvH4WV18VJDP2i9pTbC+tby5nxVExLLFyAkbjbS2Dvg==");
console.log("Expected lower = ZD/z07UvdmL3aYz0tsVo+bFXF5VldNcns6ezyfea777KOmLiizrUNDYe+v1bh2QTT4AySf1NICgXxWXB6f7c6A==");
