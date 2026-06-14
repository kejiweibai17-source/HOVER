"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  Send,
  CheckCircle,
  ChevronUp,
  MessageSquare,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

export default function ContactPage() {
  const [formState, setFormState] = useState("idle"); // idle, submitting, success

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState("submitting");
    // 模擬 API 請求
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setFormState("success");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="w-full bg-white font-sans text-gray-900 pt-20">
      {/* === 1. 頁首標題區 (Minimalist Header) === */}

      {/* === 2. 表單區塊 (Table-like Form) === */}
      <section className="py-20 px-6">
        <div className="max-w-[1000px] mx-auto">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <h1 className="text-4xl text-stone-700 mx-auto text-center md:text-5xl font-black tracking-widest mb-4">
              聯絡我們
            </h1>
          </motion.div>
          <div className="text-center mb-16">
            <h2 className="text-xl md:text-2xl font-bold flex items-center justify-center gap-3 text-stone-700">
              CONTACT FORM
            </h2>
            <p className="mt-6 text-xl text-stone-700 font-bold tracking-widest">
              線上諮詢表單
            </p>
            <p className="text-stone-700 mt-4 text-sm tracking-wider">
              請填寫以下必填資訊，確認無誤後點擊「確認送出」。
            </p>
          </div>

          {formState === "success" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-16 text-center"
            >
              <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle size={48} />
              </div>
              <h3 className="text-3xl font-bold text-[#2e2e2e] mb-4 tracking-widest">
                訊息已成功送出
              </h3>
              <p className="text-gray-500 mb-10 leading-relaxed">
                感謝您的聯繫！我們已收到您的表單。
                <br />
                客服團隊將會盡快透過您提供的聯絡方式與您聯繫，請耐心等候。
              </p>
              <button
                onClick={() => setFormState("idle")}
                className="px-10 py-4 bg-[#2e2e2e] text-white rounded-full font-bold tracking-widest hover:bg-blue-700 transition duration-300"
              >
                返回表單
              </button>
            </motion.div>
          ) : (
            <motion.form
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              onSubmit={handleSubmit}
              className="border-t-[3px] border-[#2e2e2e]"
            >
              {/* 表單列：姓名 */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-col md:flex-row border-b border-gray-200 py-6 md:py-8"
              >
                <div className="w-full md:w-[280px] shrink-0 font-bold text-stone-800 flex items-center gap-3 mb-4 md:mb-0">
                  姓名
                  <span className="bg-[#2e2e2e] text-white text-[11px] px-2 py-1 rounded-sm tracking-widest">
                    必填
                  </span>
                </div>
                <div className="flex-1">
                  <input
                    required
                    type="text"
                    className="w-full bg-[#f4f5f7] border-transparent rounded-md px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="輸入名稱姓名"
                  />
                </div>
              </motion.div>

              {/* 表單列：聯絡電話 */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-col md:flex-row border-b border-gray-200 py-6 md:py-8"
              >
                <div className="w-full md:w-[280px] shrink-0 font-bold text-stone-800 flex items-center gap-3 mb-4 md:mb-0">
                  聯絡電話
                  <span className="bg-[#2e2e2e] text-white text-[11px] px-2 py-1 rounded-sm tracking-widest">
                    必填
                  </span>
                </div>
                <div className="flex-1">
                  <input
                    required
                    type="tel"
                    className="w-full bg-[#f4f5f7] border-transparent rounded-md px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="你的聯絡電話"
                  />
                </div>
              </motion.div>

              {/* 表單列：電子信箱 */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-col md:flex-row border-b border-gray-200 py-6 md:py-8"
              >
                <div className="w-full md:w-[280px] shrink-0 font-bold text-stone-800 flex items-center gap-3 mb-4 md:mb-0">
                  電子信箱
                </div>
                <div className="flex-1">
                  <input
                    type="email"
                    className="w-full bg-[#f4f5f7] border-transparent rounded-md px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder=" example@mail.com"
                  />
                </div>
              </motion.div>

              {/* 表單列：詢問主旨 */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-col md:flex-row border-b border-gray-200 py-6 md:py-8"
              >
                <div className="w-full md:w-[280px] shrink-0 font-bold text-stone-800 flex items-center gap-3 mb-4 md:mb-0">
                  詢問主旨
                </div>
                <div className="flex-1">
                  <select className="w-full bg-[#f4f5f7] border-transparent rounded-md px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all appearance-none cursor-pointer text-gray-700">
                    <option value="">請選擇項目</option>
                    <option>產品相關諮詢</option>
                    <option>訂單與配送問題</option>
                    <option>企業採購 / 異業合作</option>
                    <option>其他建議</option>
                  </select>
                </div>
              </motion.div>

              {/* 表單列：訊息內容 */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-col md:flex-row border-b border-gray-200 py-6 md:py-8"
              >
                <div className="w-full md:w-[280px] shrink-0 font-bold text-stone-800 flex items-start gap-3 mb-4 md:mb-0 pt-2">
                  訊息內容
                  <span className="bg-[#2e2e2e] text-white text-[11px] px-2 py-1 rounded-sm tracking-widest">
                    必填
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    required
                    rows={6}
                    className="w-full bg-[#f4f5f7] border-transparent rounded-md px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                    placeholder="請盡可能詳細描述您的需求或問題..."
                  />
                </div>
              </motion.div>

              {/* 隱私權同意與送出按鈕 */}
              <motion.div
                variants={fadeInUp}
                className="mt-16 flex flex-col items-center"
              >
                <p className="text-sm text-gray-500 mb-8 tracking-wider text-center">
                  送出表單前，請確認您已了解並同意我們的
                  <Link
                    href="/privacy"
                    className="text-blue-600 underline underline-offset-4 mx-1 hover:text-[#2e2e2e]"
                  >
                    隱私權政策
                  </Link>
                  。
                </p>
                <button
                  type="submit"
                  disabled={formState === "submitting"}
                  className="group relative overflow-hidden bg-[#F5A49F] text-white font-bold tracking-widest text-lg px-16 py-5 rounded-full hover:bg-[#c06762] transition-all duration-300 shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto"
                >
                  {formState === "submitting" ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      發送中...
                    </>
                  ) : (
                    <>
                      確認送出{" "}
                      <Send
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </motion.div>
            </motion.form>
          )}
        </div>
      </section>

      {/* === 3. 頁尾深色聯絡區 (The Big Dark Footer) === */}
      <section className="bg-[#F5A49F] text-white pt-24 pb-20 relative mt-10">
        {/* 浮動的 PAGE TOP 按鈕 */}
        <div
          onClick={scrollToTop}
          className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-white text-[#2e2e2e] flex flex-col items-center justify-center rounded-full shadow-lg cursor-pointer hover:-translate-y-2 transition-transform duration-300 z-10 group"
        >
          <ChevronUp
            size={20}
            className="group-hover:text-blue-600 transition-colors"
          />
        </div>
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-bold tracking-widest text-gray-400">
          PAGE TOP
        </div>

        {/* 巨大標題 */}
        <div className="text-center mb-20 px-4">
          <h2 className="text-5xl md:text-[5rem] lg:text-[7rem] font-black tracking-widest opacity-90 mb-4 font-sans">
            CONTACT
          </h2>
          <p className="text-sm md:text-base text-stone-700 tracking-[0.2em]">
            電話。Email
          </p>
        </div>

        {/* 聯絡資訊分隔網格 */}
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 border-t border-b border-white/10">
          {/* 左半邊：電話 */}
          <div className="p-10 md:p-16 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center text-center hover:bg-white/5 transition-colors duration-500">
            <div className="flex items-center gap-3 mb-6 text-stone-200">
              <Phone size={28} />
              <span className="text-xl font-bold tracking-[0.2em]">TEL</span>
            </div>
            <a
              href="tel:0978038797"
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 hover:text-blue-400 transition-colors duration-300"
            >
              0978-038-797
            </a>
            <p className="text-stone-700 text-sm tracking-widest bg-white/10 px-4 py-2 rounded-full">
              營業時間 11:00 - 18:00
            </p>
          </div>

          {/* 右半邊：Email */}
          <div className="p-10 md:p-16 flex flex-col items-center text-center hover:bg-white/5 transition-colors duration-500">
            <div className="flex items-center gap-3 mb-6 text-stone-200">
              <Mail size={28} />
              <span className="text-xl font-bold tracking-[0.2em]">EMAIL</span>
            </div>
            <a
              href="mailto:service@hoverofficial.com"
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 hover:text-blue-400 transition-colors duration-300"
            >
              service@hoverofficial.com
            </a>
            <p className="text-stone-700 text-sm tracking-widest bg-white/10 px-4 py-2 rounded-full">
              我們將於 24 小時內回覆
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
