"use client";

import Image from "next/image";

const FRIENDS_BENEFITS = [
  "免費註冊，即可加入HOVER會員",
  "入會禮 NT$100購物金",
  "生日禮 NT$100購物金",
  "新品與活動優先通知",
];

const EXCLUSIVE_BENEFITS = [
  "年度累積消費滿 NT$10,000 即可升級",
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
  "入會禮與生日禮將以折扣碼形式發放，單品消費滿 NT$1,000 可使用，須於指定期限內使用，恕不折抵運費。",
  "購物金適用範圍及是否可與其他優惠活動合併使用，依活動頁面及系統結帳顯示為準。",
  "HOVER保留會員制度，優惠內容及活動辦法調整之權利。",
];

function BenefitList({ items }: { items: string[] }) {
  return (
    <div className="mt-6 flex w-full flex-col items-stretch md:mt-8">
      {items.map((item, i) => (
        <div key={item} className="w-full">
          <span className="block px-1 py-3 text-center text-[12px] leading-[1.75] tracking-[0.04em] text-[#2a514d] sm:text-[12.5px] md:py-4 md:text-[13px] md:leading-[1.85]">
            {item}
          </span>
          {i > 0 && i < items.length - 1 && (
            <span className="block h-px w-full bg-[#e8d8b0]" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}

function TierCard({
  iconSrc,
  iconAlt,
  titleEn,
  titleZh,
  benefits,
}: {
  iconSrc: string;
  iconAlt: string;
  titleEn: string;
  titleZh: string;
  benefits: string[];
}) {
  return (
    <div className="relative flex flex-col rounded-xl border border-[#e8e8e8] bg-white px-10 pb-8 pt-12 md:rounded-2xl md:px-20 md:pb-10 md:pt-16 ">
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#2a514d] md:h-[96px] md:w-[96px]">
          <Image
            src={iconSrc}
            alt={iconAlt}
            width={72}
            height={72}
            className="h-[60px] w-[60px] object-contain md:h-[65px] md:w-[65px]"
          />
        </div>
      </div>

      <p className="text-center font-serif text-[16px] font-bold tracking-[0.08em] text-[#2a514d] sm:text-[18px] md:text-[22px] md:tracking-[0.1em]">
        {titleEn}
      </p>
      <p className="mt-1 text-center font-serif text-[15px] font-medium text-[#2a514d] sm:text-[16px] md:mt-1.5 md:text-[20px]">
        {titleZh}
      </p>
      <div className="mt-3 h-[1.3px] w-full bg-[#2a514d] md:mt-4" />

      <BenefitList items={benefits} />
    </div>
  );
}

export default function MembershipClient() {
  return (
    <div className="relative bg-white pb-20">
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
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-4 md:gap-8">
          <TierCard
            iconSrc="/images/icon/品牌好友.png"
            iconAlt="品牌好友"
            titleEn="HOVER FRIENDS"
            titleZh="品牌好友"
            benefits={FRIENDS_BENEFITS}
          />
          <TierCard
            iconSrc="/images/icon/臻享會員.png"
            iconAlt="臻享會員"
            titleEn="HOVER EXCLUSIVE"
            titleZh="臻享會員"
            benefits={EXCLUSIVE_BENEFITS}
          />
        </div>

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
                  臻享會員
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
        <div className="rounded-2xl border border-[#e8e8e8] bg-white px-5 py-7 md:px-10 md:py-10">
          <h2 className="mb-5 font-serif text-[16px] font-bold tracking-[0.06em] text-[#2a514d] md:mb-6 md:text-[18px]">
            購物金使用說明
          </h2>
          <ol className="space-y-4 text-left font-serif text-[12px] leading-[2] tracking-[0.02em] text-[#2a514d] md:text-[13px]">
            {USAGE_NOTES.map((note, i) => (
              <li key={note} className="flex gap-1.5">
                <span className="shrink-0">{i + 1}.</span>
                <span>{note}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
