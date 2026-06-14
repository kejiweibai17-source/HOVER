"use client";

import { Link } from "next-view-transitions";

const SECTIONS = [
  {
    title: "一、適用範圍",
    paragraphs: [
      "停機坪國際文創股份有限公司（統一編號：90230279，以下簡稱「本公司」）重視您的隱私權。本隱私權政策說明當您使用 HOVER 威爾特官方網站（以下簡稱「本網站」）時，我們如何蒐集、處理、利用及保護您的個人資料。",
      "本政策適用於本網站及透過本網站提供之會員、購物與客服服務。若您透過第三方平台連結至本網站，該第三方平台亦可能有其獨立之隱私政策，請另行參閱。",
    ],
  },
  {
    title: "二、蒐集之個人資料類型",
    paragraphs: [
      "註冊與會員資料：如手機號碼、電子信箱、帳號、密碼（加密儲存）、生日等。",
      "訂單與交易資料：如收件人姓名、地址、聯絡電話、訂購內容、付款方式、發票資訊及訂單紀錄。",
      "客服與聯絡資料：您透過聯絡表單、電子郵件或客服管道提供之訊息內容。",
      "技術與使用資料：如 IP 位址、瀏覽器類型、裝置資訊、造訪時間及 Cookie 資料，用於網站運作與體驗優化。",
      "第三方登入資料：若您選擇以 LINE 或 Facebook 快速登入，我們將依您授權取得必要之識別資訊（如姓名、電子信箱），僅用於會員驗證與服務提供。",
    ],
  },
  {
    title: "三、蒐集目的與利用方式",
    paragraphs: [
      "提供會員註冊、登入驗證、訂單處理、商品配送、售後服務及客戶支援。",
      "寄送訂單通知、物流更新、電子發票、帳號驗證信及重要服務公告。",
      "進行會員權益管理、消費紀錄查詢、優惠活動通知（您可隨時選擇停止接收行銷訊息）。",
      "改善網站功能、分析使用趨勢、維護資訊安全及防範詐欺行為。",
      "依法律規定或主管機關要求提供必要資訊。",
    ],
  },
  {
    title: "四、Cookie 與類似技術",
    paragraphs: [
      "本網站使用 Cookie 及類似技術以維持登入狀態、記錄購物車內容及提升瀏覽體驗。您可透過瀏覽器設定管理或停用 Cookie，但部分功能可能因此無法正常運作。",
    ],
  },
  {
    title: "五、資料分享與第三方服務",
    paragraphs: [
      "為完成交易與服務，您的資料可能在必要範圍內提供予物流業者、金流服務商（如 ECPay、LINE Pay）、電子發票平台及雲端主機服務商，該等合作廠商僅得於授權目的內使用資料。",
      "除前述情形、法律要求或經您同意外，本公司不會將您的個人資料出售或任意提供予第三人。",
    ],
  },
  {
    title: "六、資料保存期間",
    paragraphs: [
      "您的個人資料將於蒐集目的存續期間或法令規定之保存期限內予以保存。訂單及交易相關資料，將依稅法及其他相關法規保存必要期間。",
      "保存期限屆滿或目的消失後，本公司將依法刪除或進行去識別化處理。",
    ],
  },
  {
    title: "七、資料安全",
    paragraphs: [
      "本公司採取合理之技術與管理措施保護您的個人資料，包含傳輸加密、存取權限控管及定期安全檢視。",
      "惟網際網路傳輸無法保證絕對安全，請您亦妥善保管帳號密碼，避免使用過於簡單或與其他服務相同之密碼。",
    ],
  },
  {
    title: "八、您的權利",
    paragraphs: [
      "依個人資料保護法，您得向本公司行使查詢、閱覽、製給複本、補充、更正、停止蒐集／處理／利用或刪除之權利。",
      "若您欲行使上述權利，請來信 service@hoverofficial.com，我們將於法定期限內回覆處理。",
      "您亦可於會員中心更新部分個人資料，或申請停用帳號（依法令或履約需求仍須保存之資料除外）。",
    ],
  },
  {
    title: "九、未成年人保護",
    paragraphs: [
      "本網站服務主要對象為成年人。若您未滿十八歲，請在法定代理人同意下使用本網站及提供個人資料。",
    ],
  },
  {
    title: "十、政策修訂與聯絡方式",
    paragraphs: [
      "本公司保留修訂本隱私權政策之權利，修訂後將公布於本頁面並標示更新日期。若修訂內容涉及重大權益變更，我們將以適當方式通知您。",
      "若對本政策有任何疑問，歡迎聯繫：",
    ],
    contact: {
      company: "停機坪國際文創股份有限公司",
      email: "service@hoverofficial.com",
      hours: "MON.–FRI. 10:00–19:00",
    },
  },
];

export default function Client() {
  return (
    <div className="bg-hover-bg">
      <section className="mx-auto max-w-[900px] px-4 py-20 text-center md:px-8 md:py-28">
        <p className="mb-4 text-[13px] tracking-[0.3em] text-[#555] uppercase">
          PRIVACY POLICY
        </p>
        <h1 className="mb-4 text-[28px] font-bold leading-snug text-black md:text-[36px]">
          隱私權保護
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
                  {section.contact && (
                    <ul className="mt-2 space-y-1 text-[14px] leading-[1.9] text-[#555]">
                      <li>{section.contact.company}</li>
                      <li>
                        電子信箱：
                        <a
                          href={`mailto:${section.contact.email}`}
                          className="ml-1 text-[#2a514d] underline hover:opacity-70"
                        >
                          {section.contact.email}
                        </a>
                      </li>
                      <li>服務時間：{section.contact.hours}</li>
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14 border-t border-[#eee] pt-10 text-center">
            <p className="mb-6 text-[14px] text-[#555]">
              關於網站使用規範，請參閱服務條款。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/terms"
                className="inline-block bg-[#2a514d] px-8 py-3 text-[13px] tracking-widest text-white transition-colors hover:bg-[#1e3d3a]"
              >
                服務條款
              </Link>
              <Link
                href="/contact"
                className="inline-block border border-[#2a514d] px-8 py-3 text-[13px] tracking-widest text-[#2a514d] transition-colors hover:bg-[#2a514d]/5"
              >
                聯絡我們
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
