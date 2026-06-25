"use client";

import { useState } from "react";
type Section = {
  num: string;
  title: string;
  paragraphs: string[];
  list?: string[];
};

const SECTIONS: Section[] = [
  {
    num: "01",
    title: "購物流程",
    paragraphs: [
      "歡迎於 HOVER 官方網站選購商品，購物流程如下：",
    ],
    list: [
      "瀏覽商品：於「ALL ITEMS」或各分類頁面挑選喜愛的商品，點選進入商品頁確認尺寸、顏色與數量。",
      "加入購物袋：選定規格後點選「加入購物袋」，可繼續選購或前往結帳。",
      "登入／註冊：結帳前請先登入會員或完成註冊，以累積消費、享有會員權益。",
      "填寫收件資訊：確認購物袋內容後，填寫收件人姓名、聯絡電話與配送地址。",
      "選擇付款方式並完成付款：依結帳頁面指示完成付款，訂單即成立。",
      "訂單確認：付款成功後，系統將寄送訂單確認信至您的電子信箱，您亦可於會員中心查詢訂單狀態。",
    ],
  },
  {
    num: "02",
    title: "付款方式",
    paragraphs: [
      "HOVER 官方網站提供以下付款方式，實際可選項目以結帳頁面顯示為準：",
      "所有線上交易均透過第三方金流平台加密處理，HOVER 不會留存您的完整信用卡資訊。",
    ],
    list: [
      "信用卡一次付清：支援 VISA、MasterCard、JCB 等主流信用卡，透過綠界安全金流完成交易。",
      "LINE Pay：選擇 LINE Pay 後將跳轉至 LINE Pay 付款頁面完成結帳。",
      "ATM 虛擬帳號／超商代碼：選擇信用卡金流選項後，亦可於綠界頁面選擇 ATM 轉帳或超商繳費（依當次結帳頁面提供項目為準）。",
    ],
  },
  {
    num: "03",
    title: "配送方式",
    paragraphs: [
      "HOVER 目前提供台灣本島及離島地區宅配服務，配送方式如下：",
    ],
    list: [
      "宅配到府：商品出貨後由合作物流業者配送至您指定的收件地址。",
      "配送範圍：台灣本島各縣市；部分離島地區可能需額外運費或配送天數，依結帳頁面顯示為準。",
      "運費計算：全館單筆訂單滿 NT$2,000 享免運優惠；未達門檻則依結帳頁面顯示之運費計收。",
      "收件注意：請填寫正確且可聯絡之電話與地址，若因資料錯誤導致配送失敗或退件，相關衍生費用由訂購人負擔。",
    ],
  },
  {
    num: "04",
    title: "出貨與配送時間",
    paragraphs: [
      "現貨商品：訂單確認並完成付款後，一般於 1–3 個工作天內出貨（不含例假日及國定假日）。",
      "預購／缺貨商品：依商品頁面標示之預計出貨時間為準，出貨後將另行通知。",
      "配送時間：出貨後依物流狀況及收件地區，一般需 1–3 個工作天送達；偏遠地區或連續假期可能略有延遲。",
      "查詢進度：出貨後系統將寄送含物流單號之通知信，您亦可於會員中心「訂單紀錄」查詢配送狀態。",
    ],
  },
  {
    num: "05",
    title: "訂單注意事項",
    paragraphs: [
      "訂單送出前，請再次確認商品規格、數量、收件資訊及付款金額是否正確。",
      "訂單成立後如需變更收件地址、規格或取消訂單，請儘速聯繫客服 service@hoverofficial.com，本公司將視訂單處理進度協助處理；已出貨之訂單恕無法變更配送地址。",
      "若遇商品缺貨、價格標示錯誤或其他無法履約之情形，HOVER 將主動與您聯繫，協助取消或變更訂單。",
      "依消費者保護法規定，您享有商品到貨後七日鑑賞期（非試用期）之權益；退換貨相關規定請參閱服務條款或聯繫客服。",
      "發票將依法開立電子發票，並寄送至您訂購時提供之電子信箱。",
    ],
  },
  {
    num: "06",
    title: "防詐騙提醒",
    paragraphs: [
      "近期詐騙手法猖獗，請提高警覺，保護自身權益：",
    ],
    list: [
      "HOVER 不會以電話、簡訊或即時通訊要求您提供信用卡完整卡號、效期、安全碼或網銀密碼。",
      "HOVER 不會要求您至 ATM 操作、下載不明 App 或點擊非官方網站之連結進行「退款」或「解除分期」。",
      "官方客服信箱為 service@hoverofficial.com；若有疑慮，請直接透過官網「聯絡我們」或上述信箱與我們確認，勿輕信來路不明之訊息。",
      "收到可疑電話或訊息時，請勿提供個人資料或進行任何轉帳，並可撥打 165 反詐騙專線求證。",
    ],
  },
];

function AccordionItem({
  section,
  open,
  onToggle,
}: {
  section: Section;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[#d8d8d8]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left md:py-6"
      >
        <span className="flex items-baseline gap-3 md:gap-4">
          <span className="text-[13px] font-light tracking-[0.08em] text-[#999] md:text-[14px]">
            {section.num}
          </span>
          <span className="text-[15px] font-medium tracking-[0.06em] text-[#2a514d] md:text-[16px]">
            {section.title}
          </span>
        </span>
        <span
          className="shrink-0 text-[22px] font-light leading-none text-[#2a514d] transition-transform duration-300"
          aria-hidden
        >
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[2000px] pb-6 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-3 text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px]">
          {section.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {section.list && (
            <ul className="list-none space-y-2 pl-0">
              {section.list.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="shrink-0 text-[#2a514d]">・</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HowToBuyClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-10 pt-14 text-center md:pb-14 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          如何購買
        </h1>
      </header>

      <div className="mx-auto max-w-[760px] border-t border-[#d8d8d8] px-4 md:px-6">
        {SECTIONS.map((section, i) => (
          <AccordionItem
            key={section.num}
            section={section}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}
