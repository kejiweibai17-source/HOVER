"use client";

import { Link } from "next-view-transitions";

const SECTIONS = [
  {
    title: "一、總則",
    paragraphs: [
      "歡迎使用 HOVER 威爾特官方網站（以下簡稱「本網站」）。本網站由停機坪國際文創股份有限公司（統一編號：90230279，以下簡稱「本公司」）經營。",
      "當您瀏覽、註冊會員或於本網站完成訂購，即表示您已閱讀、理解並同意遵守本服務條款。若您不同意本條款內容，請停止使用本網站及相關服務。",
    ],
  },
  {
    title: "二、會員資格與帳號管理",
    paragraphs: [
      "您須提供正確、完整且最新的個人資料以完成註冊。會員應妥善保管帳號與密碼，不得將帳號提供予他人使用。",
      "若發現帳號遭冒用或異常使用，請立即通知本公司客服。因會員未妥善保管帳號所致之損害，由會員自行承擔。",
      "本公司保留於必要時暫停、限制或終止違反本條款之會員帳號使用權利。",
    ],
  },
  {
    title: "三、商品資訊與訂購",
    paragraphs: [
      "本網站所展示之商品圖片、顏色、尺寸及說明僅供參考，實際商品可能因螢幕顯示、拍攝光線或批次差異而略有不同。",
      "訂單成立以本公司系統確認並接受您的訂購為準。若商品缺貨、價格標示錯誤或其他無法履約之情形，本公司將主動與您聯繫並協助取消或變更訂單。",
      "會員於結帳前應確認訂購內容、收件資訊及付款方式；訂單送出後，如需變更請儘速聯繫客服，本公司將視訂單處理進度協助處理。",
    ],
  },
  {
    title: "四、價格、付款與發票",
    paragraphs: [
      "本網站商品價格以結帳頁面顯示之金額為準，含適用之會員優惠及運費計算結果。本公司保留調整價格與優惠活動之權利。",
      "付款方式依結帳頁面提供之選項為準，包含信用卡、第三方金流及其他本公司公告之方式。",
      "依中華民國稅法規定，本公司將依法開立電子發票，並寄送至您提供之電子信箱。",
    ],
  },
  {
    title: "五、配送與運費",
    paragraphs: [
      "現貨商品一般於訂單確認後 1–3 個工作天內出貨，實際配送時間依物流狀況及收件地區而定。",
      "全館單筆訂單滿 NT$2,000 享免運優惠，未達門檻則依結帳頁面顯示之運費計收。",
      "請確認收件地址及聯絡電話正確，若因資料錯誤導致配送延誤或退件，相關衍生費用由訂購人負擔。",
    ],
  },
  {
    title: "六、退換貨與鑑賞期",
    paragraphs: [
      "依消費者保護法規定，您享有商品到貨後七日鑑賞期（非試用期）之權益。鑑賞期內如商品未下水、未使用且保持完整包裝與吊牌，可申請退換貨。",
      "內衣、貼身衣物、客製化商品或已明確標示不適用退換貨之商品，依相關法規及商品頁說明辦理。",
      "退換貨申請請透過客服信箱 service@hoverofficial.com 或本網站聯絡我們頁面提出，並提供訂單編號及退換貨原因，本公司將於確認後告知後續流程。",
    ],
  },
  {
    title: "七、智慧財產權",
    paragraphs: [
      "本網站之商標、Logo、圖片、文字、版型設計及其他內容，均受著作權法及相關法令保護，未經本公司書面同意，不得擅自複製、轉載、散布或用於商業用途。",
    ],
  },
  {
    title: "八、免責聲明",
    paragraphs: [
      "本公司將盡力維持本網站正常運作，惟對於因天災、網路中斷、系統維護、第三方服務異常或其他不可抗力所致之服務中斷或資料損失，不負賠償責任。",
      "會員因違反本條款或相關法令所致之損害，應自行負責。",
    ],
  },
  {
    title: "九、條款修訂與準據法",
    paragraphs: [
      "本公司保留隨時修訂本服務條款之權利，修訂後之內容將公布於本頁面。若您於修訂後繼續使用本網站，視為同意修訂內容。",
      "本條款之解釋與適用，以中華民國法律為準據法。雙方就本條款所生爭議，以臺灣臺北地方法院為第一審管轄法院。",
    ],
  },
];

export default function Client() {
  return (
    <div className="bg-hover-bg">
      <section className="mx-auto max-w-[900px] px-4 py-20 text-center md:px-8 md:py-28">
        <p className="mb-4 text-[13px] tracking-[0.3em] text-[#555] uppercase">
          TERMS OF SERVICE
        </p>
        <h1 className="mb-4 text-[28px] font-bold leading-snug text-black md:text-[36px]">
          服務條款
        </h1>
        <p className="text-[13px] tracking-[0.08em] text-[#888]">
          最後更新：2026 年 6 月 10 日
        </p>
      </section>

      <section className="border-t border-[#e8e8e8] bg-white py-16 md:py-20">
        <div className="mx-auto max-w-[720px] px-4 md:px-8">
          <div className="space-y-10">
            {SECTIONS.map((section) => (
              <article key={section.title}>
                <h2 className="mb-4 text-[17px] font-semibold text-black">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.paragraphs.map((p) => (
                    <p
                      key={p.slice(0, 24)}
                      className="text-[14px] leading-[1.9] text-[#555]"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14 border-t border-[#eee] pt-10 text-center">
            <p className="mb-6 text-[14px] text-[#555]">
              如有任何疑問，歡迎與我們聯繫。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-block bg-[#2a514d] px-8 py-3 text-[13px] tracking-widest text-white transition-colors hover:bg-[#1e3d3a]"
              >
                聯絡我們
              </Link>
              <Link
                href="/privacy"
                className="inline-block border border-[#2a514d] px-8 py-3 text-[13px] tracking-widest text-[#2a514d] transition-colors hover:bg-[#2a514d]/5"
              >
                隱私權保護
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
