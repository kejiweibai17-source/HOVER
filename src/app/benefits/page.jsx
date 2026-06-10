// app/member/benefits/page.jsx
import React from "react";
import Link from "next/link";

const TIERS = [
  {
    id: "bronze",
    name: "銅貴賓",
    upgradeCondition: "註冊即成為銅貴賓",
    upgradeGift: "$50 購物金",
    duration: "永久",
    discount: "—",
    birthdayGift: "生日當月獲 $100 購物金",
    renewCondition: "—",
    renewGift: "—",
    tag: "入門會員",
  },
  {
    id: "silver",
    name: "銀貴賓",
    upgradeCondition: "12 個月內消費滿 $2,000 即升等銀貴賓",
    upgradeGift: "$100 購物金",
    duration: "12 個月",
    discount: "98 折",
    birthdayGift: "生日當月獲 $200 購物金",
    renewCondition: "12 個月內消費滿 $2,000 即維持等級",
    renewGift: "$200 購物金",
    tag: "輕度愛用者",
  },
  {
    id: "gold",
    name: "金貴賓",
    upgradeCondition: "12 個月內消費滿 $6,000 即升等金貴賓",
    upgradeGift: "$300 購物金",
    duration: "12 個月",
    discount: "95 折",
    birthdayGift: "生日當月獲 $300 購物金",
    renewCondition: "12 個月內消費滿 $6,000 即維持等級",
    renewGift: "$300 購物金",
    tag: "忠實會員",
  },
  {
    id: "uvip",
    name: "VIP 貴賓",
    upgradeCondition: "12 個月內消費滿 $10,000 即升等 UVIP 貴賓",
    upgradeGift: "$500 購物金",
    duration: "12 個月",
    discount: "9 折",
    birthdayGift: "生日當月獲 $500 購物金",
    renewCondition: "12 個月內消費滿 $10,000 即維持等級",
    renewGift: "$500 購物金",
    tag: "高階 VIP",
  },
  {
    id: "uvvip",
    name: "VVIP 貴賓",
    upgradeCondition: "12 個月內消費滿 $35,000 即升等 UVVIP 貴賓",
    upgradeGift: "$1,000 購物金",
    duration: "12 個月",
    discount: "88 折",
    birthdayGift: "生日當月獲 $1,000 購物金",
    renewCondition: "12 個月內消費滿 $35,000 即維持等級",
    renewGift: "$1,000 購物金",
    tag: "頂級尊榮",
  },
];

export default function MemberBenefitsPage() {
  return (
    <main className="bg-slate-50 py-20 px-5">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:pt-14">
        {/* Hero 區塊 */}
        <section className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              UFLOW MEMBERSHIP
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-wide text-slate-900 md:text-4xl">
              會員制度與專屬福利
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 md:text-[15px]">
              只要註冊加入，即可成為 U 銅貴賓會員，隨著消費金額累積，
              會員等級與專屬優惠也會同步升級。從生日購物金、升等禮、續會禮到
              消費折扣，讓每一次消費都更有價值。
            </p>
          </div>

          <div className="mt-4 flex flex-col items-start gap-3 md:mt-0 md:items-end">
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black"
            >
              立即登入 / 加入會員
            </Link>
            <p className="text-xs text-slate-500">
              還沒有帳號？{" "}
              <Link
                href="/register"
                className="font-medium text-slate-900 underline-offset-4 hover:underline"
              >
                前往註冊
              </Link>
            </p>
          </div>
        </section>

        {/* 會員制度說明 */}
        <section className="mb-10">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-6">
            <h2 className="text-base font-semibold text-slate-900">
              會員制度說明
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              會員資格或優惠辦法皆由本公司訂定，請會員務必遵守。本公司保有隨時變更及增列會員權益相關條件之權利，恕不另行個別通知。
              最新內容將以網站公告為準。
            </p>
            <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-slate-600">
              <li>• 壽星好禮將於生日當月 1 日匯入會員帳戶。</li>
              <li>
                • 生日購物金將於發放日起算 30 天內有效，逾期失效恕不補發。
              </li>
              <li>
                • 當月壽星之生日購物金，如未於當月 1
                日前完成註冊，則不追溯補發，將於次年度生日當月發放。
              </li>
            </ul>
          </div>
        </section>

        {/* 等級卡片總覽 */}
        <section className="mb-10">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            會員等級一覽
          </h2>
          <p className="mb-5 text-sm text-slate-600">
            依照年度累積消費金額升級等級，每一級都享有對應的折扣與購物金禮遇。
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {TIERS.map((tier, idx) => (
              <div
                key={tier.id}
                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"
              >
                <div
                  className={`bg-gradient-to-b ${
                    idx === 0
                      ? "from-amber-50 to-white"
                      : idx === 1
                      ? "from-slate-50 to-white"
                      : idx === 2
                      ? "from-yellow-50 to-white"
                      : idx === 3
                      ? "from-indigo-50 to-white"
                      : "from-purple-50 to-white"
                  } px-4 pb-3 pt-4`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Level {idx + 1}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{tier.tag}</p>
                </div>
                <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-[13px] text-slate-700">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      升等條件
                    </p>
                    <p className="mt-0.5 leading-snug">
                      {tier.upgradeCondition}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      會員期限
                    </p>
                    <p className="mt-0.5 leading-snug">{tier.duration}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      消費優惠
                    </p>
                    <p className="mt-0.5 leading-snug">
                      {tier.discount === "—" ? "依活動公告" : tier.discount}
                    </p>
                  </div>
                  <div className="mt-1 rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-500">
                      升等禮
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate-800">
                      {tier.upgradeGift}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      生日再享：{tier.birthdayGift}
                    </p>
                  </div>
                  <div className="mt-auto pt-1 text-[11px] text-slate-500">
                    續會條件：{tier.renewCondition}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 詳細權益對照表 */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            詳細權益對照表
          </h2>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="min-w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-[11px] font-semibold tracking-[0.18em] text-slate-500">
                    權益項目
                  </th>
                  {TIERS.map((tier) => (
                    <th
                      key={tier.id}
                      className="border-b border-slate-200 px-3 py-3 text-center text-[12px] font-semibold text-slate-700"
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 升等條件 */}
                <tr className="border-t border-slate-100">
                  <th className="bg-slate-50 px-3 py-3 text-left text-[12px] font-semibold text-slate-700">
                    升等條件
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier.id + "-upgrade"}
                      className="px-3 py-3 text-center align-top text-slate-700"
                    >
                      {tier.upgradeCondition}
                    </td>
                  ))}
                </tr>

                {/* 升等禮 */}
                <tr className="border-t border-slate-100">
                  <th className="bg-slate-50 px-3 py-3 text-left text-[12px] font-semibold text-slate-700">
                    升等禮
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier.id + "-upgradeGift"}
                      className="px-3 py-3 text-center text-slate-700"
                    >
                      {tier.upgradeGift}
                    </td>
                  ))}
                </tr>

                {/* 會員期限 */}
                <tr className="border-t border-slate-100">
                  <th className="bg-slate-50 px-3 py-3 text-left text-[12px] font-semibold text-slate-700">
                    會員期限
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier.id + "-duration"}
                      className="px-3 py-3 text-center text-slate-700"
                    >
                      {tier.duration}
                    </td>
                  ))}
                </tr>

                {/* 消費優惠 */}
                <tr className="border-t border-slate-100">
                  <th className="bg-slate-50 px-3 py-3 text-left text-[12px] font-semibold text-slate-700">
                    消費優惠
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier.id + "-discount"}
                      className="px-3 py-3 text-center text-slate-700"
                    >
                      {tier.discount === "—" ? "—" : tier.discount}
                    </td>
                  ))}
                </tr>

                {/* 壽星好禮 */}
                <tr className="border-t border-slate-100">
                  <th className="bg-slate-50 px-3 py-3 text-left text-[12px] font-semibold text-slate-700">
                    壽星好禮
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier.id + "-birthday"}
                      className="px-3 py-3 text-center text-slate-700"
                    >
                      {tier.birthdayGift}
                    </td>
                  ))}
                </tr>

                {/* 續會條件 */}
                <tr className="border-t border-slate-100">
                  <th className="bg-slate-50 px-3 py-3 text-left text-[12px] font-semibold text-slate-700">
                    續會條件
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier.id + "-renewCondition"}
                      className="px-3 py-3 text-center text-slate-700"
                    >
                      {tier.renewCondition}
                    </td>
                  ))}
                </tr>

                {/* 續會禮 */}
                <tr className="border-t border-slate-100">
                  <th className="bg-slate-50 px-3 py-3 text-left text-[12px] font-semibold text-slate-700">
                    續會禮
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier.id + "-renewGift"}
                      className="px-3 py-3 text-center text-slate-700"
                    >
                      {tier.renewGift}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            ※ 所有金額皆以新台幣計算；實際權益與條件以官網公告與系統紀錄為準。
          </p>
        </section>
      </div>
    </main>
  );
}
