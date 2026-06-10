"use client";

import { motion } from "framer-motion";

// ===================== 👑 SEO 與結構化資料設定 =====================
// 備註：在 App Router 中，如果要在 'use client' 頁面使用 Metadata，
// 建議將 Metadata 放在同目錄下的 layout.js 或者單獨的伺服器組件中。
// 為了示範方便，我直接在下方說明結構。

const SITE_URL = "https://www.uflow.space";

export default function PrivacyPage() {
  // 結構化資料 (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "隱私權政策 | UFLOW 健康生活",
    description:
      "UFLOW 官方網站隱私權保護政策，說明我們如何蒐集、處理及利用您的個人資料，並致力於保護您的資訊安全。",
    url: `${SITE_URL}/privacy`,
    publisher: {
      "@type": "Organization",
      name: "慶安有福有限公司",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo/uflow.png`,
      },
    },
    datePublished: "2025-12-15",
    dateModified: "2025-12-15",
    inLanguage: "zh-TW",
  };

  return (
    <main className="bg-white min-h-screen pt-32 pb-20">
      {/* 注入結構化資料 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 頁面標題 */}
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-bold text-[#2b3742] mb-4">
              隱私權政策
            </h1>
            <p className="text-gray-500 mt-4">
              最近更新日期：2025 年 12 月 15 日
            </p>
          </div>

          {/* 內容區塊 */}
          <div className="space-y-10 text-gray-700 leading-8">
            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                1. 隱私權保護政策的適用範圍
              </h2>
              <p>
                歡迎您光臨「UFLOW
                官方網站」（以下簡稱本網站），本網站由慶安有福有限公司（以下簡稱本公司）經營。
                隱私權保護政策內容，包括本網站如何處理在您使用網站服務時收集到的個人識別資料。隱私權保護政策不適用於本網站以外的相關連結網站，也不適用於非本網站所委託或參與管理的人員。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                2. 個人資料的蒐集、處理及利用方式
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  當您造訪本網站或使用本網站所提供之功能服務時，我們將視該服務功能性質，請您提供必要的個人資料（如姓名、電話、電子郵件、配送地址等），並在該特定目的範圍內處理及利用您的個人資料。
                </li>
                <li>
                  本網站在您使用服務信箱、聯絡我們等互動性功能時，會保留您所提供的姓名、電子郵件地址、聯絡方式及使用時間等。
                </li>
                <li>
                  於一般瀏覽時，伺服器會自行記錄相關行徑，包括您使用連線設備的
                  IP 位址、使用時間、使用的瀏覽器、瀏覽及點選資料記錄等。
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                3. 資料之保護
              </h2>
              <p>
                本網站主機均設有防火牆、防毒系統等相關的各項資訊安全設備及必要的安全防護措施，加以保護網站及您的個人資料採用嚴格的保護措施。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                4. Cookie 之使用
              </h2>
              <p>
                為了提供您最佳的服務，本網站會在您的電腦中放置並取用我們的
                Cookie。若您不願接受，可設定瀏覽器隱私權等級為高，但可能會導致網站某些功能無法正常執行。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                5. 隱私權保護政策之修正
              </h2>
              <p>
                本網站隱私權保護政策將因應需求隨時進行修正，修正後的條款將刊登於網站上。
              </p>
            </section>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mt-8">
              <h3 className="font-bold text-[#2b3742] mb-2">
                對隱私權有任何疑問？
              </h3>
              <p className="text-sm">
                如果您對我們的隱私權政策有任何疑問，歡迎透過以下方式聯繫：
                <br />
                電子信箱：uflowspace@gmail.com <br />
                聯絡電話：0978-038-797
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
