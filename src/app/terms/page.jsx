"use client";

import { motion } from "framer-motion";
import TestimonialsSection from "@/components/TestimonialsSection"; // 根據你的路徑調整

export default function TermsPage() {
  return (
    <main className="bg-white min-h-screen pt-32 pb-20">
      {/* <TestimonialsSection /> */}
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 頁面標題 */}
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-bold text-[#2b3742] mb-4">服務條款</h1>
            <div className="w-16 h-1 bg-blue-500 mx-auto rounded-full"></div>
            <p className="text-gray-500 mt-4">使用本網站前請詳閱以下條款</p>
          </div>

          {/* 內容區塊 */}
          <div className="space-y-10 text-gray-700 leading-8">
            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                1. 認知與接受條款
              </h2>
              <p>
                慶安有福有限公司（以下簡稱「本公司」）係依據本服務條款提供 UFLOW
                官方網站（以下簡稱「本網站」）服務。當您使用本網站時，即表示您已閱讀、瞭解並同意接受本服務條款之所有內容。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                2. 會員註冊與責任
              </h2>
              <p>為了能使用本服務，您同意以下事項：</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>依本服務註冊表之提示提供您本人正確、最新及完整的資料。</li>
                <li>維持並更新您個人資料，確保其為正確、最新及完整。</li>
                <li>
                  您有義務妥善保管您的帳號及密碼，並為此組帳號與密碼登入系統後所進行之一切活動負責。
                </li>
              </ul>
            </section>

            <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h2 className="text-xl font-bold text-blue-800 mb-3 flex items-center gap-2">
                ⚠️ 3. 醫學免責聲明（重要）
              </h2>
              <p className="text-blue-900 font-medium">
                本網站所販售之產品為食品及營養補充品，並非藥品，不具有醫療效能，無法取代正規醫療。
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-blue-800 text-sm">
                <li>
                  網站內容（包含文章、專家建議）僅供衛教參考，不應視為醫療診斷或治療建議。
                </li>
                <li>
                  若您有懷孕、哺乳、正在服用處方藥物或有特殊疾病，使用本產品前請務必諮詢醫師或專業醫療人員。
                </li>
                <li>產品成效因個人體質而異。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                4. 交易行為
              </h2>
              <p>
                您同意在使用本網站訂購產品時，於確認訂單後，即表示您有意願依該訂單內容及相關網頁上所載明的交易條件購買該商品。本公司保留接受訂單與否的權利。若因交易條件有誤、商品無庫存或有其他正當理由，本公司得拒絕接受您的訂單。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                5. 智慧財產權的保護
              </h2>
              <p>
                本網站所使用之軟體或程式、網站上所有內容，包括但不限於著作、圖片、檔案、資訊、資料、網站架構、網站畫面的安排、網頁設計，均由本公司依法擁有其智慧財產權。任何人不得逕自使用、修改、重製、公開播送、改作、散布。
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
