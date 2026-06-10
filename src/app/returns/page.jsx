"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function ReturnsPage() {
  return (
    <main className="bg-white min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 頁面標題 */}
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-bold text-[#2b3742] mb-4">
              退換貨說明
            </h1>
            <div className="w-16 h-1 bg-blue-500 mx-auto rounded-full"></div>
            <p className="text-gray-500 mt-4">UFLOW 提供您安心的購物保障</p>
          </div>

          {/* 內容區塊 */}
          <div className="space-y-10 text-gray-700 leading-8">
            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                1. 七天鑑賞期說明
              </h2>
              <p>
                依照消費者保護法規定，UFLOW
                消費者均享有商品到貨七天鑑賞期之權益（注意！鑑賞期非試用期）。
                您可以在收到商品後七天內（含例假日），在未拆封使用的情況下申請退貨。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                2. 無法辦理退貨的情況
              </h2>
              <p>下列情況將無法接受退換貨，請您留意：</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>超過七天鑑賞期（以物流簽收單或郵戳日期為準）。</li>
                <li>
                  <span className="font-bold text-red-500">商品已經拆封</span>
                  （保健食品屬於食品類，考量衛生安全，一經拆封除商品本身瑕疵外，恕不接受退貨）。
                </li>
                <li>商品包裝不完整、配件遺失或有人為損壞。</li>
                <li>惡意或大量退貨。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                3. 退貨流程
              </h2>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <ol className="list-decimal pl-5 space-y-4 font-medium">
                  <li>
                    <span className="font-bold text-gray-900">聯繫客服：</span>
                    <br />
                    請於鑑賞期內透過{" "}
                    <Link href="/contact" className="text-blue-600 underline">
                      聯絡我們
                    </Link>{" "}
                    或撥打客服專線
                    0978-038-797，提供您的「訂單編號」及「退貨原因」。
                  </li>
                  <li>
                    <span className="font-bold text-gray-900">確認退貨：</span>
                    <br />
                    客服人員確認符合退貨資格後，將提供您退貨寄送資訊。
                  </li>
                  <li>
                    <span className="font-bold text-gray-900">包裝寄回：</span>
                    <br />
                    請將商品保持完整（含贈品、發票），妥善包裝後寄回指定地址。
                  </li>
                  <li>
                    <span className="font-bold text-gray-900">退款處理：</span>
                    <br />
                    收到退回商品確認無誤後，我們將於 7-14
                    個工作天內進行退款作業。
                  </li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2b3742] mb-3">
                4. 瑕疵換貨
              </h2>
              <p>
                若您收到的商品有瑕疵（如包裝破損、內容物外漏、寄錯商品等），請於收到商品當下拍照存證，並於
                7 日內儘速聯繫我們，我們將由專人協助您進行無償換貨處理。
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
