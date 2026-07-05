"use client";

import { ShoppingBag, Crown } from "lucide-react";

const FRIENDS_BENEFITS = [
  "入會禮 NT$100購物金",
  "生日禮 NT$100購物金",
  "新品與活動優先通知",
];

const EXCLUSIVE_BENEFITS = [
  "全年正價商品95折",
  "生日禮 NT$300購物金",
  "限量商品優先購買",
  "會員專屬活動邀請",
];

const TABLE_ROWS: {
  label: string;
  friends: string;
  exclusive: string;
}[] = [
  { label: "入會資格", friends: "免費註冊", exclusive: "年度累積滿NT$10,000" },
  { label: "有效期限", friends: "永久有效", exclusive: "升級日起12個月" },
  { label: "續會資格", friends: "—", exclusive: "效期內累積滿NT$8,000" },
  { label: "生日禮", friends: "NT$100 購物金", exclusive: "NT$300 購物金" },
  { label: "新品與活動通知", friends: "V", exclusive: "V" },
  { label: "正價商品95折", friends: "—", exclusive: "V" },
  { label: "限量商品優先購買", friends: "—", exclusive: "V" },
  { label: "會員專屬活動邀請", friends: "—", exclusive: "V" },
];

const USAGE_NOTES = [
  "入會禮與生日禮將以折扣碼形式發放，單品消費滿 NT$1,000可使用，須於指定期限內使用，恕不折抵運費。",
  "購物金適用範圍及是否可與其他優惠活動合併使用，依活動頁面及系統結帳顯示為準。",
  "HOVER保留會員制度，優惠內容及活動辦法調整之權利。",
];

function TierCard({
  icon: Icon,
  titleEn,
  titleZh,
  subtitle,
  benefits,
}: {
  icon: typeof ShoppingBag;
  titleEn: string;
  titleZh: string;
  subtitle: string;
  benefits: string[];
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#d8d8d8] bg-white px-4 py-8 md:px-8 md:py-12">
      <div className="mb-4 flex justify-center md:mb-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2a514d] text-white md:h-20 md:w-20">
          <Icon size={22} strokeWidth={1.5} className="md:hidden" />
          <Icon size={28} strokeWidth={1.5} className="hidden md:block" />
        </div>
      </div>
      <p className="text-center font-serif text-[11px] tracking-[0.1em] text-[#2a514d] md:text-[16px] md:tracking-[0.12em]">
        {titleEn}
      </p>
      <p className="mt-1 text-center font-serif text-[16px] font-medium text-[#2a514d] md:text-[26px]">
        {titleZh}
      </p>
      <p className="mx-auto mt-3 max-w-[280px] text-center text-[10px] leading-[1.8] tracking-[0.04em] text-[#2a514d] md:mt-5 md:text-[13px] md:leading-[1.9]">
        {subtitle}
      </p>
      <div className="mt-5 space-y-0 md:mt-8">
        {benefits.map((item) => (
          <div
            key={item}
            className="border-t border-[#d8d8d8] py-3 text-center text-[10px] leading-relaxed tracking-[0.04em] text-[#2a514d] md:py-4 md:text-[13px]"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MembershipClient() {
  return (
    <div className="relative bg-white pb-20">
      {/* Header */}
      <header className="px-4 pb-12 pt-14 text-center md:pb-16 md:pt-20">
        <h1 className="font-serif text-[36px] font-medium tracking-[0.14em] text-[#2a514d] md:text-[48px] lg:text-[56px]">
          MEMBERSHIP
        </h1>
        <div className="mx-auto mt-5 flex max-w-[320px] items-center gap-4 md:mt-6">
          <span className="h-px flex-1 bg-[#2a514d]/60" />
          <span className="font-serif text-[18px] tracking-[0.2em] text-[#2a514d] md:text-[20px]">
            會員制度
          </span>
          <span className="h-px flex-1 bg-[#2a514d]/60" />
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] space-y-10 px-4 md:space-y-12 md:px-6">
        {/* Tier cards */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          <TierCard
            icon={ShoppingBag}
            titleEn="HOVER FRIENDS"
            titleZh="品牌好友"
            subtitle="免費註冊，即可加入HOVER會員"
            benefits={FRIENDS_BENEFITS}
          />
          <TierCard
            icon={Crown}
            titleEn="HOVER EXCLUSIVE"
            titleZh="尊享會員"
            subtitle="年度累積消費滿 NT$10,000 即可升級"
            benefits={EXCLUSIVE_BENEFITS}
          />
        </div>

        {/* Comparison table */}
        <div className="overflow-hidden overflow-x-auto rounded-2xl border border-[#d8d8d8] bg-white">
          <table className="w-full min-w-[640px] border-collapse text-center text-[12px] text-[#2a514d] md:text-[13px]">
            <thead>
              <tr className="bg-[#2a514d] text-white">
                <th className="px-4 py-4 font-medium tracking-[0.08em] md:px-6 md:py-5">
                  會員權益
                </th>
                <th className="px-4 py-4 font-medium leading-snug tracking-[0.06em] md:px-6 md:py-5">
                  HOVER FRIENDS
                  <br />
                  品牌好友
                </th>
                <th className="px-4 py-4 font-medium leading-snug tracking-[0.06em] md:px-6 md:py-5">
                  HOVER EXCLUSIVE
                  <br />
                  尊享會員
                </th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-[#d8d8d8]">
                  <td className="bg-white px-4 py-4 font-medium tracking-[0.06em] md:px-6 md:py-5">
                    {row.label}
                  </td>
                  <td className="px-4 py-4 tracking-[0.04em] md:px-6 md:py-5">
                    {row.friends}
                  </td>
                  <td className="px-4 py-4 tracking-[0.04em] md:px-6 md:py-5">
                    {row.exclusive}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Usage notes */}
        <div className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] px-5 py-7 md:px-10 md:py-10">
          <h2 className="mb-6 text-center font-serif text-[18px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[20px]">
            購物金使用說明
          </h2>
          <ol className="mx-auto max-w-[820px] space-y-4 text-[12px] leading-[2] tracking-[0.04em] text-[#2a514d] md:text-[13px]">
            {USAGE_NOTES.map((note, i) => (
              <li key={note} className="flex gap-2">
                <span className="shrink-0 font-medium">{i + 1}.</span>
                <span>{note}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
