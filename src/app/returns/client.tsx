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
    title: "退貨須知",
    paragraphs: [
      "依消費者保護法規定，您享有商品到貨後七日鑑賞期（非試用期）之權益。",
      "鑑賞期起算日為商品送達收件地址之翌日起算；若商品於鑑賞期內未下水、未使用且保持完整包裝、吊牌及配件，可申請退貨。",
      "退貨申請請於鑑賞期內提出，逾期恕不受理。",
      "退貨運費依退貨原因判定：若為商品瑕疵或本公司疏失，退貨運費由本公司負擔；若為個人因素（如尺寸不合、改變心意等），退貨運費由消費者自行負擔。",
    ],
  },
  {
    num: "02",
    title: "退貨申請流程",
    paragraphs: [
      "若您有退貨需求，請依下列步驟提出申請：",
      "亦可直接來信 service@hoverofficial.com 或透過「聯絡我們」頁面提出，請提供訂單編號、退貨原因及聯絡方式，客服將協助您完成申請。",
    ],
    list: [
      "登入會員中心，至「訂單查詢／申請退貨」找到欲退貨之訂單。",
      "填寫退貨申請表，說明退貨原因並上傳商品照片（如有瑕疵請特別標示）。",
      "等候客服審核：審核通過後，系統將寄送退貨指示信至您的電子信箱。",
      "依指示將商品妥善包裝，並於指定期限內寄回或至指定超商退貨。",
      "本公司收到退貨商品並確認狀態符合退貨條件後，將進行退款作業。",
    ],
  },
  {
    num: "03",
    title: "超商退貨說明",
    paragraphs: [
      "部分退貨案件可透過超商退貨服務辦理，實際是否適用以客服審核結果及通知信內容為準。",
    ],
    list: [
      "收到退貨審核通過通知後，請依信件內指示之超商退貨代碼及期限辦理。",
      "請將商品放入原包裝袋或適當包材中，並附上退貨單或訂單資訊，至指定超商門市完成退貨。",
      "超商退貨完成後，物流系統將更新退件狀態；本公司收到商品後始進行後續退款流程。",
      "若超商退貨逾時或未依指示包裝，可能導致退貨失敗，請務必於期限內完成。",
    ],
  },
  {
    num: "04",
    title: "退貨商品狀態",
    paragraphs: [
      "為保障雙方權益，退貨商品須符合以下狀態，否則本公司得拒絕退貨或酌收整新費用：",
    ],
    list: [
      "商品未下水、未洗涤、未使用，無人為污損、異味或修改痕跡。",
      "吊牌、標籤完整未拆除，原包裝袋、配件、贈品一併退回。",
      "商品無因試穿、試用造成之磨損、脫線或變形。",
      "退貨商品須與原訂單品項、規格一致，恕不接受部分退貨（除非另有公告）。",
    ],
  },
  {
    num: "05",
    title: "無法退貨情形",
    paragraphs: ["以下情形恕無法辦理退貨，敬請見諒："],
    list: [
      "超過七日鑑賞期始提出退貨申請。",
      "商品已下水、洗涤、使用，或吊牌、包裝已拆除、遺失。",
      "內衣、貼身衣物、襪類等基於衛生考量之商品（依相關法規及商品頁標示）。",
      "客製化商品、限量聯名商品或商品頁已明確標示「不提供退換貨」者。",
      "因消費者保管不當所致之損壞、污損或配件缺漏。",
      "特價出清、福袋或標示為最終 sale 之商品（依商品頁說明為準）。",
    ],
  },
  {
    num: "06",
    title: "退款方式與時間",
    paragraphs: [
      "退貨商品經確認符合退貨條件後，將依原付款方式進行退款：",
      "退款金額為該品項實付金額；若訂單曾使用折扣碼、購物金或免運優惠，退款計算依系統結帳紀錄為準。",
      "運費、手續費是否退還，依退貨原因及本公司退貨政策判定；個人因素退貨時，原訂單享用之免運優惠若因退貨而不符免運條件，可能從退款金額中扣除相應運費。",
      "電子發票將依法辦理折讓或作廢，無需另行寄回。",
    ],
    list: [
      "信用卡：退款將刷退至原信用卡帳戶，實際入帳時間依發卡銀行作業約 7–14 個工作天。",
      "LINE Pay：退款將退回 LINE Pay 帳戶，一般約 3–7 個工作天。",
      "ATM／超商代碼：退款將匯至您提供之指定銀行帳戶，約 7–14 個工作天。",
    ],
  },
  {
    num: "07",
    title: "貼心提醒",
    paragraphs: [
      "建議收到商品後先確認品項、尺寸及外觀，若有瑕疵請於鑑賞期內儘速聯繫客服，並保留完整包裝以便退換。",
      "退貨前請勿自行寄回至非客服指定之地址，以免無法順利辦理。",
      "換貨需求請先提出退貨申請，待退款完成後重新下單購買所需品項（或依客服指示辦理）。",
      "如有任何疑問，歡迎來信 service@hoverofficial.com，或於週一至週五 10:00–19:00 透過 LINE ID：@HOVER 聯繫客服，我們將竭誠為您服務。",
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
          {section.paragraphs.map((p, idx) => (
            <p key={`${section.num}-p-${idx}`}>{p}</p>
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

export default function ReturnsClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-8 pt-14 text-center md:pb-10 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          申請退貨
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px]">
          HOVER 希望每一次購買都能讓您安心。若您收到商品後有退貨需求，請依照以下說明提出申請，我們將協助您完成退貨流程。
        </p>
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
