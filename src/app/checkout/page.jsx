// app/checkout/page.jsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tag, CheckCircle2 } from "lucide-react"; // 加入 CheckCircle2

/* ====== 假資料（可改成 cartStore 實際資料） ====== */
const INIT_ITEMS = [
  {
    productId: 0,
    id: "airflex-pants-gray-l",
    title: "AirFlex™ 機能柔韌訓練長褲（鐵灰）",
    variant: "L",
    img: "https://images.unsplash.com/photo-1596755094514-f87e3eaf8d15?q=80&w=600&auto=format&fit=crop",
    price: 1038,
    compareAt: 1180,
    qty: 2,
  },
];

/* ====== 金額工具 ====== */
const currency = (n) =>
  `NT$${(Math.round(n * 100) / 100).toLocaleString("zh-TW")}`;

// ✅ 修正計算邏輯：加入 couponDiscount 參數
function calcPricing(
  items,
  { shippingBase = 80, freeShipThreshold = 1800 },
  couponDiscount = 0,
) {
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const saveFromSale = items.reduce(
    (s, it) => s + Math.max(0, (it.compareAt || it.price) - it.price) * it.qty,
    0,
  );

  // 扣除優惠券 (最多折抵到 0 元)
  const safeDiscount = Math.min(couponDiscount, subtotal);
  const discountedSubtotal = subtotal - safeDiscount;

  // 用折抵後的金額計算運費
  const shipping =
    discountedSubtotal >= freeShipThreshold || discountedSubtotal === 0
      ? 0
      : shippingBase;
  const total = discountedSubtotal + shipping;

  return { subtotal, shipping, discount: safeDiscount, total, saveFromSale };
}

/* ====== 小元件 ====== */
function Field({ label, required, error, help, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {!error && help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
}

function RadioRow({ checked, onChange, label, right, children }) {
  return (
    <label className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="font-medium">{label}</p>
          {right}
        </div>
        {children && (
          <div className="mt-2 text-sm text-gray-600">{children}</div>
        )}
      </div>
    </label>
  );
}

function SummaryPanel({
  items,
  pricing,
  availableCoupons,
  couponLoading,
  selectedCoupon,
  onSelectCoupon,
}) {
  return (
    <aside className="w-full lg:w-[40%] xl:w-[38%]">
      <div className="lg:sticky lg:top-24 bg-white border rounded-xl p-5 lg:p-6 shadow-sm">
        {/* 商品清單 */}
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="flex gap-3">
              <div className="relative w-16 h-16 rounded-md overflow-hidden border">
                <img
                  src={it.img}
                  alt={it.title}
                  className="w-full h-full object-cover"
                />
                {it.qty > 1 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs px-1.5 py-0.5 rounded">
                    {it.qty}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight line-clamp-2">
                      {it.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {it.variant ? `尺寸 ${it.variant}` : null}
                    </p>
                  </div>
                  <div className="text-sm font-medium whitespace-nowrap">
                    {currency(it.price * it.qty)}
                  </div>
                </div>
                {it.compareAt && it.compareAt > it.price && (
                  <p className="text-[12px] text-emerald-600 mt-0.5">
                    已節省 {currency((it.compareAt - it.price) * it.qty)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ✅ 自動讀取的折扣碼錢包 UI */}
        <div className="mt-5 border-t pt-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <Tag size={16} className="text-[#008060]" /> 可用折扣金與專屬優惠
          </h3>

          {couponLoading ? (
            <p className="text-xs text-gray-400">讀取錢包中...</p>
          ) : availableCoupons.length === 0 ? (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
              <p className="text-xs text-gray-500">目前沒有可用的折扣碼</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {availableCoupons.map((c) => (
                <label
                  key={c.code}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCoupon?.code === c.code
                      ? "border-[#008060] bg-emerald-50 shadow-sm"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="checkout_coupon"
                      checked={selectedCoupon?.code === c.code}
                      onChange={() => onSelectCoupon(c)}
                      className="text-[#008060] focus:ring-[#008060] w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        折抵 NT$ {c.amount}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.description || "專屬禮金折扣"}
                      </p>
                    </div>
                  </div>
                </label>
              ))}

              {/* 取消使用按鈕 */}
              {selectedCoupon && (
                <button
                  type="button"
                  onClick={() => onSelectCoupon(null)}
                  className="mt-2 text-xs text-rose-600 hover:underline text-left inline-block w-fit"
                >
                  不使用折扣碼
                </button>
              )}
            </div>
          )}
        </div>

        {/* 金額明細 */}
        <div className="mt-5 space-y-2 text-sm border-t pt-5">
          <div className="flex justify-between">
            <span className="text-gray-600">小計</span>
            <span>{currency(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">運送</span>
            <span>
              {pricing.shipping === 0 ? (
                <>
                  <span className="line-through mr-1 text-gray-400">
                    {currency(80)}
                  </span>
                  <span className="inline-flex items-center text-emerald-700">
                    免運
                  </span>
                </>
              ) : (
                currency(pricing.shipping)
              )}
            </span>
          </div>
          {pricing.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">折扣</span>
              <span className="text-emerald-700 font-bold">
                - {currency(pricing.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <span>總計</span>
            <span className="text-xl font-black">
              {currency(pricing.total)}
            </span>
          </div>
        </div>

        {/* 節省總額 */}
        {pricing.saveFromSale + pricing.discount > 0 && (
          <div className="mt-3 text-xs text-gray-600 flex items-center gap-2 bg-amber-50 p-2 rounded-md border border-amber-100">
            <span className="font-bold text-amber-800">🎉 本次購物共節省</span>
            <span className="font-bold text-amber-600">
              {currency(pricing.saveFromSale + pricing.discount)}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function CheckoutPage() {
  const router = useRouter();

  // 商品
  const [items] = useState(INIT_ITEMS);

  // ✅ 新增：自動讀取折扣碼的狀態
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // 初始化金額
  const [pricing, setPricing] = useState(() =>
    calcPricing(items, { shippingBase: 80, freeShipThreshold: 1800 }),
  );

  // 聯絡/地址
  const [contact, setContact] = useState({ email: "", newsletter: true });
  const [addr, setAddr] = useState({
    country: "台灣",
    firstName: "",
    lastName: "",
    line1: "",
    line2: "",
    city: "",
    zip: "",
    phone: "",
    saveInfo: false,
  });

  // 運送/付款
  const [shipMethod, setShipMethod] = useState("000");
  const [payMethod, setPayMethod] = useState("card"); // 預設為綠界

  // ✅ 進來結帳頁時，馬上打 API 抓客人的錢包
  useEffect(() => {
    async function fetchMyCoupons() {
      setCouponLoading(true);
      try {
        const res = await fetch("/api/account/coupons/available", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.ok) {
          setAvailableCoupons(data.available);
        }
      } catch (e) {
        console.error("Fetch coupons failed", e);
      }
      setCouponLoading(false);
    }
    fetchMyCoupons();
  }, []);

  // ✅ 當選擇不同的折扣碼，或商品有變動時，重新計算金額
  useEffect(() => {
    const discountAmount = selectedCoupon ? Number(selectedCoupon.amount) : 0;
    const next = calcPricing(
      items,
      {
        shippingBase: 80,
        freeShipThreshold: 1800,
      },
      discountAmount,
    );
    setPricing(next);
  }, [items, selectedCoupon]);

  // 驗證
  const [errors, setErrors] = useState({});
  const validate = () => {
    const e = {};
    if (!/.+@.+\..+/.test(contact.email)) e.email = "請輸入正確的 Email";
    if (!addr.firstName) e.firstName = "必填";
    if (!addr.lastName) e.lastName = "必填";
    if (!addr.line1) e.line1 = "必填";
    if (!addr.city) e.city = "請輸入正確的城市";
    if (!addr.phone) e.phone = "必填";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const billing = {
        first_name: addr.firstName,
        last_name: addr.lastName,
        email: contact.email,
        phone: addr.phone,
        country: addr.country === "台灣" ? "TW" : addr.country,
        state: "",
        city: addr.city,
        address_1: addr.line1,
        address_2: addr.line2,
        postcode: addr.zip,
      };

      const shipping = {
        first_name: addr.firstName,
        last_name: addr.lastName,
        country: addr.country === "台灣" ? "TW" : addr.country,
        state: "",
        city: addr.city,
        address_1: addr.line1,
        address_2: addr.line2,
        postcode: addr.zip,
      };

      const line_items = items.map((it) => ({
        product_id: Number(it.productId || 0),
        name: it.title,
        quantity: Number(it.qty || 1),
        _client_price: Number(it.price || 0),
        _client_sku: it.id,
        meta_data: it.variant ? [{ key: "variant", value: it.variant }] : [],
      }));

      const payload = {
        currency: "TWD",
        payment_method: payMethod,
        shipping_method: shipMethod,
        billing,
        shipping,
        line_items,

        // ✅ 後端送出的折扣資料
        coupon: selectedCoupon
          ? { code: selectedCoupon.code, amount: selectedCoupon.amount }
          : null,

        pricing: {
          subtotal: pricing.subtotal,
          shipping: pricing.shipping,
          discount: pricing.discount,
          total: pricing.total,
        },

        contact: { email: contact.email },
        addr: {
          firstName: addr.firstName,
          lastName: addr.lastName,
          line1: `${addr.city}${addr.line1}`,
          phone: addr.phone,
        },
        total: pricing.total,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        alert(data.message || "建立訂單失敗");
        setSubmitting(false);
        return;
      }

      // 🚀 新增：如果是走路線 B (LINE Pay)，後端會回傳 redirectUrl
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      if (data.html) {
        const div = document.createElement("div");
        div.innerHTML = data.html;
        document.body.appendChild(div);
        document.getElementById("_form_ecpay")?.submit();
        return;
      }

      router.push(`/thank-you?orderId=${data.orderId}`);
    } catch (err) {
      alert("連線失敗，請稍後再試");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-[80px] sm:pt-[150px]">
      {/* 頂部品牌列 */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <img
            src="/images/logo/logo-y.png"
            alt="ARDOAK"
            className="h-7 w-auto"
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左側：表單 */}
          <section className="w-full lg:w-[60%] xl:w-[62%] space-y-8">
            {/* 聯絡方式 */}
            <div className="bg-white border rounded-xl p-5 lg:p-6 shadow-sm">
              <h2 className="text-lg font-semibold">聯絡方式</h2>
              <div className="mt-4 grid gap-4">
                <Field label="電子郵件" required error={errors.email}>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) =>
                      setContact((s) => ({ ...s, email: e.target.value }))
                    }
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060] ${
                      errors.email ? "border-red-500" : ""
                    }`}
                    placeholder="you@example.com"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={contact.newsletter}
                    onChange={(e) =>
                      setContact((s) => ({
                        ...s,
                        newsletter: e.target.checked,
                      }))
                    }
                    className="text-[#008060] focus:ring-[#008060]"
                  />
                  以電子郵件傳送最新消息和優惠活動給我
                </label>
              </div>
            </div>

            {/* 配送地址 */}
            <div className="bg-white border rounded-xl p-5 lg:p-6 shadow-sm">
              <h2 className="text-lg font-semibold">配送</h2>
              <div className="mt-4 grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="國家/地區">
                    <select
                      value={addr.country}
                      onChange={(e) =>
                        setAddr((s) => ({ ...s, country: e.target.value }))
                      }
                      className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060]"
                    >
                      <option>台灣</option>
                      <option>香港</option>
                      <option>日本</option>
                    </select>
                  </Field>
                  <Field label="名字" required error={errors.firstName}>
                    <input
                      value={addr.firstName}
                      onChange={(e) =>
                        setAddr((s) => ({ ...s, firstName: e.target.value }))
                      }
                      className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060] ${
                        errors.firstName ? "border-red-500" : ""
                      }`}
                      placeholder="名字"
                    />
                  </Field>
                  <Field label="姓氏" required error={errors.lastName}>
                    <input
                      value={addr.lastName}
                      onChange={(e) =>
                        setAddr((s) => ({ ...s, lastName: e.target.value }))
                      }
                      className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060] ${
                        errors.lastName ? "border-red-500" : ""
                      }`}
                      placeholder="姓氏"
                    />
                  </Field>
                </div>

                <Field label="地址（區域＋路名）" required error={errors.line1}>
                  <input
                    value={addr.line1}
                    onChange={(e) =>
                      setAddr((s) => ({ ...s, line1: e.target.value }))
                    }
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060] ${
                      errors.line1 ? "border-red-500" : ""
                    }`}
                    placeholder="例：板橋區重慶路 〇號"
                  />
                </Field>
                <Field label="地址 2（選填）">
                  <input
                    value={addr.line2}
                    onChange={(e) =>
                      setAddr((s) => ({ ...s, line2: e.target.value }))
                    }
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060]"
                    placeholder="樓層、公司…"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field
                    label="城市（必填）"
                    required
                    error={errors.city}
                    help="例：台北市、新竹縣…"
                  >
                    <input
                      value={addr.city}
                      onChange={(e) =>
                        setAddr((s) => ({ ...s, city: e.target.value }))
                      }
                      className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060] ${
                        errors.city ? "border-red-500" : ""
                      }`}
                    />
                  </Field>
                  <Field label="郵遞區號（選填）">
                    <input
                      value={addr.zip}
                      onChange={(e) =>
                        setAddr((s) => ({ ...s, zip: e.target.value }))
                      }
                      className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060]"
                    />
                  </Field>
                  <Field label="電話" required error={errors.phone}>
                    <input
                      value={addr.phone}
                      onChange={(e) =>
                        setAddr((s) => ({ ...s, phone: e.target.value }))
                      }
                      className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#008060] ${
                        errors.phone ? "border-red-500" : ""
                      }`}
                      placeholder="09xxxxxxxx"
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={addr.saveInfo}
                    onChange={(e) =>
                      setAddr((s) => ({ ...s, saveInfo: e.target.checked }))
                    }
                    className="text-[#008060] focus:ring-[#008060]"
                  />
                  儲存此資訊供下次使用
                </label>
              </div>
            </div>

            {/* 運送方式 */}
            <div className="bg-white border rounded-xl p-5 lg:p-6 shadow-sm">
              <h2 className="text-lg font-semibold">運送方式</h2>
              <div className="mt-4 grid gap-3">
                <RadioRow
                  checked={shipMethod === "000"}
                  onChange={() => setShipMethod("000")}
                  label="000「宅配速送」新竹物流"
                  right={
                    pricing.shipping === 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="line-through text-gray-400">
                          {currency(80)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs">
                          免費
                        </span>
                      </div>
                    ) : (
                      <span>{currency(80)}</span>
                    )
                  }
                >
                  運送至：{addr.city || "—"}
                </RadioRow>
              </div>
            </div>

            {/* 🚀 替換付款區塊：加入 LINE Pay */}
            <div className="bg-white border rounded-xl p-5 lg:p-6 shadow-sm">
              <h2 className="text-lg font-semibold">付款</h2>
              <p className="text-sm text-gray-500 mt-1">
                所有交易都受安全加密保護。{" "}
                <span className="inline-block ml-1">🔒</span>
              </p>

              <div className="mt-4 grid gap-3">
                {/* 綠界選項 */}
                <RadioRow
                  checked={payMethod === "card"}
                  onChange={() => setPayMethod("card")}
                  label="綠界安全支付 (信用卡/ATM/超商代碼)"
                  right={
                    <div className="flex items-center gap-1 opacity-70">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg"
                        alt="VISA"
                        className="h-4 w-auto"
                      />
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                        alt="Mastercard"
                        className="h-4 w-auto"
                      />
                    </div>
                  }
                >
                  {payMethod === "card" && (
                    <p className="text-xs text-gray-500 mt-2 animate-in fade-in">
                      點擊「立即付款」後將跳轉至綠界科技安全金流頁面進行結帳。
                    </p>
                  )}
                </RadioRow>

                {/* 🚀 新增 LINE Pay 選項 */}
                <RadioRow
                  checked={payMethod === "linepay"}
                  onChange={() => setPayMethod("linepay")}
                  label="LINE Pay 官方支付"
                  right={
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/2/2a/LINE_logo.svg"
                      alt="LINE Pay"
                      className="h-5 w-auto"
                    />
                  }
                >
                  {payMethod === "linepay" && (
                    <p className="text-xs text-emerald-600 font-bold mt-2 animate-in fade-in flex items-center gap-1">
                      <CheckCircle2 size={14} /> 點擊付款將導向 LINE Pay
                      官方驗證授權。
                    </p>
                  )}
                </RadioRow>
              </div>
            </div>

            {/* 送出 */}
            <div className="flex items-center justify-between">
              <a href="/cart" className="text-sm text-gray-600 hover:underline">
                ← 返回購物車
              </a>
              <button
                onClick={submit}
                disabled={submitting}
                className={`px-8 py-3.5 rounded-lg font-bold text-lg transition-all ${
                  submitting
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-[#008060] text-white hover:bg-[#006e52] hover:shadow-lg active:scale-95"
                }`}
              >
                {submitting ? "處理跳轉中…" : "立即付款"}
              </button>
            </div>
          </section>

          {/* 右側：摘要與錢包 */}
          <SummaryPanel
            items={items}
            pricing={pricing}
            availableCoupons={availableCoupons}
            couponLoading={couponLoading}
            selectedCoupon={selectedCoupon}
            onSelectCoupon={setSelectedCoupon}
          />
        </div>
      </main>
    </div>
  );
}
