"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// 🚨 確保 Link 正確匯入
import { Link } from "next-view-transitions";

// ============================================================================
// SVG Icons
// ============================================================================
const Icons = {
  Instagram: (props) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  X: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Facebook: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  YouTube: (props) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon
        points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  ),
  Line: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M20.2 11.5c0-4.6-4.6-8.5-10.2-8.5S0 6.9 0 11.5c0 4.2 3.7 7.7 8.5 8.3v4.1c0 .5.5.7.8.4l4.5-4c2.8-.5 6.4-3 6.4-8.8zM6.5 13.5h-2c-.3 0-.5-.2-.5-.5v-3c0-.3.2-.5.5-.5s.5.2.5.5v2.5h1.5c.3 0 .5.2.5.5s-.2.5-.5.5zm4 0h-2c-.3 0-.5-.2-.5-.5v-3c0-.3.2-.5.5-.5h2c.3 0 .5.2.5.5s-.2.5-.5.5v3c0 .3-.2.5-.5.5zm1.5-3.5c0-.3.2-.5.5-.5s.5.2.5.5v3c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-3zm5.5 1.5c0 .3-.2.5-.5.5h-1.5v1c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-3c0-.3.2-.5.5-.5h2c.3 0 .5.2.5.5s-.2.5-.5.5v1h1.5c.3 0 .5.2.5.5z" />
    </svg>
  ),
  Mail: (props) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
};

export default function Content() {
  // 清除頁面轉場狀態
  useEffect(() => {
    document.body.classList.remove("page-transition");
    sessionStorage.removeItem("transitioning");
  }, []);

  return (
    <div className="relative w-full bg-[#EDEEEF] text-slate-800">
      <Section2 />
      <ShareWidget />
    </div>
  );
}

// ============================================================================
// Footer 內容區塊
// ============================================================================
// ... (前面其他的引入與 Icons 定義保留不變)

// ============================================================================
// Footer 內容區塊
// ============================================================================
const Section2 = () => {
  return (
    <footer className="w-full bg-[#EDEEEF] pt-16 pb-32 lg:pt-24 lg:pb-32 px-6 sm:px-10 lg:px-20 xl:px-32">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
        {/* === 左側：連結導覽區 === */}
        <div className="lg:col-span-8 flex flex-col gap-12 border-b border-slate-300 lg:border-none pb-10 lg:pb-0">
          <FooterSection
            title="BRAND SITE"
            links={[
              { label: "首頁", href: "/" },
              { label: "關於 UFLOW", href: "/about" },
              { label: "檢驗認證｜公司情報", href: "/inspection" },
              { label: "聯絡我們", href: "/contact" },
              { label: "網站使用條款", href: "/terms-of-use" },
              { label: "隱私權政策", href: "/privacy" },
            ]}
          />

          <div className="border-t border-slate-300 w-full opacity-60 my-2 lg:hidden"></div>
          <FooterSection
            title="OFFICIAL ONLINE SHOP"
            links={[
              { label: "商城首頁", href: "/shop" },
              { label: "產品列表", href: "/products" },
              { label: "UFLOW FAMILY", href: "/family" },
            ]}
          />

          <div className="border-t border-slate-300 w-full opacity-60 my-2 lg:hidden"></div>
          <FooterSection
            title="HEALTHY UFLOW - 保健小知識"
            links={[
              {
                label: "熬夜、日曬族的養顏美容營養補給新選擇",
                href: "https://gcm.org.tw/blog/uflow-tjfl-cfy/",
              },
              {
                label: "幫助維持消化道機能",
                href: "https://gcm.org.tw/blog/uflow-synbiotics-cya/",
              },
              {
                label: "幫助入睡兼顧調整體質",
                href: "https://gcm.org.tw/blog/uflow-gaba-lzh/",
              },
              {
                label: "韓國專利成分安全又幫助入睡",
                href: "https://gcm.org.tw/blog/uflow-gaba-lkm/",
              },
              {
                label: "忙碌上班族的日常營養補給策略",
                href: "https://gcm.org.tw/blog/uflow-synbiotics-lxm/",
              },
              {
                label: "營養補給複方安心選擇",
                href: "https://gcm.org.tw/blog/uflow-tjfl-cay/",
              },
              {
                label: "四大專利複方養顏好吸收",
                href: "https://gcm.org.tw/blog/uflow-clj/",
              },
              {
                label: "溫和幫助入睡採大廠頂尖原料",
                href: "https://gcm.org.tw/blog/uflow-gaba-dsj/",
              },
              {
                label: "營養師專業視角下的選擇",
                href: "https://gcm.org.tw/blog/uflow-synbiotics-ljx/",
              },
            ]}
          />
        </div>

        {/* === 右側：SNS 與 APP === */}
        <div className="lg:col-span-4 flex flex-col items-start lg:items-center pt-4 lg:pt-0 lg:border-l lg:border-slate-300 lg:pl-10">
          <div className="mb-12 text-center w-full">
            <h3 className="font-serif text-[15px] font-bold tracking-widest text-slate-800 mb-6 uppercase">
              Official SNS
            </h3>
            <div className="flex justify-center gap-6 sm:gap-8">
              {/* 🌟 補上真實的連結 href */}
              <SocialIcon
                href="https://lin.ee/uKRvV64" // ✅ 新增的 LINE 連結
                icon={Icons.Line}
                label="LINE"
              />
              <SocialIcon
                href="https://www.instagram.com/uflow"
                icon={Icons.Instagram}
                label="Instagram"
              />
              <SocialIcon
                href="https://www.facebook.com/uflow"
                icon={Icons.Facebook}
                label="Facebook"
              />
              <SocialIcon
                href="https://www.youtube.com/@uflow"
                icon={Icons.YouTube}
                label="YouTube"
              />
            </div>
          </div>

          <div className="mb-12 text-center w-full">
            <h3 className="font-serif text-[15px] font-bold tracking-widest text-slate-800 mb-4 uppercase">
              UFLOW FAMILY APP
            </h3>
          </div>
        </div>
      </div>

      {/* 底部版權聲明 */}
      <div className="mt-20 text-center text-[10px] text-slate-500 tracking-wider">
        COPYRIGHT © {new Date().getFullYear()} UFLOW CORPORATION. ALL RIGHTS
        RESERVED.
      </div>
      <div className="mt-4 text-center text-[13px] text-slate-500 tracking-wider">
        Design By{" "}
        <Link
          className="font-bold hover:text-stone-900"
          href="https://www.jeek-webdesign.com.tw"
          target="_blank"
        >
          極客網頁設計.Jeek-WebDeisgn
        </Link>
      </div>
    </footer>
  );
};

// ... (後面其他的 Helper Components 與 ShareWidget 保留不變)
// ============================================================================
// Helper Components
// ============================================================================

/** 🌟 SEO 優化：改用 <nav> 標籤 */
function FooterSection({ title, links }) {
  return (
    <div className="w-full">
      <h3 className="font-serif text-[15px] font-bold tracking-widest text-slate-800 mb-4 uppercase">
        {title}
      </h3>
      <nav className="flex flex-wrap gap-x-0 gap-y-2 text-[11px] sm:text-[12px] font-medium text-slate-600 leading-relaxed">
        {links.map((link, idx) => (
          <React.Fragment key={link.href + idx}>
            <Link
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : "_self"}
              className="hover:text-black transition-colors px-2 first:pl-0"
            >
              {link.label}
            </Link>
            {idx !== links.length - 1 && (
              <span className="text-slate-300">|</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
}

/** 🌟 a11y 優化：改用 <a> 標籤並加上 aria-label */
function SocialIcon({ icon: Icon, label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`前往 UFLOW 的 ${label}`}
      className="flex flex-col items-center gap-2 group cursor-pointer"
    >
      <div className="text-slate-800 group-hover:text-slate-500 transition-colors">
        <Icon width={24} height={24} />
      </div>
      <span className="text-[10px] font-medium text-slate-800 tracking-wide group-hover:text-slate-500 transition-colors">
        {label}
      </span>
    </a>
  );
}

// ============================================================================
// Share Widget (真實分享邏輯)
// ============================================================================
function ShareWidget() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClick = (e) => {
      if (isOpen && !e.target.closest("#share-widget-container")) {
        setIsOpen(false);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [isOpen]);

  // 實作真實分享邏輯
  const handleShare = (platform) => {
    const currentUrl = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("來看看 UFLOW 專業保健食品！");

    if (platform === "facebook")
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`,
        "_blank",
      );
    if (platform === "line")
      window.open(
        `https://line.me/R/msg/text/?${text}%0D%0A${currentUrl}`,
        "_blank",
      );
    if (platform === "x")
      window.open(
        `https://twitter.com/intent/tweet?url=${currentUrl}&text=${text}`,
        "_blank",
      );
    if (platform === "mail")
      window.location.href = `mailto:?subject=${text}&body=${currentUrl}`;

    setIsOpen(false);
  };

  return (
    <div
      id="share-widget-container"
      className="fixed bottom-0 left-0 w-full z-[9999] flex flex-col items-center justify-end pointer-events-none"
    >
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="share-button"
            className="pointer-events-auto pb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              className="flex items-center gap-2 bg-[#EBEBEB]/90 border border-white/50 backdrop-blur-md px-6 py-2.5 rounded-full hover:bg-white hover:scale-105 transition-all duration-300 group"
              style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
            >
              <span className="font-serif font-bold text-slate-800 tracking-wider text-sm group-hover:text-black">
                Share
              </span>
              <div className="bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                <span className="text-slate-800 text-xs font-bold leading-none mt-[1px]">
                  +
                </span>
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="share-bar"
            className="pointer-events-auto w-full h-[60px] md:h-[70px] grid grid-cols-4"
            style={{ boxShadow: "0 -4px 30px rgba(0,0,0,0.15)" }}
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ShareBlock
              bg="bg-[#2C9BE5]"
              icon={<Icons.X width={28} height={28} className="text-white" />}
              ariaLabel="分享至 X (Twitter)"
              onClick={() => handleShare("x")}
            />
            <ShareBlock
              bg="bg-[#00B900]"
              icon={
                <Icons.Line width={28} height={28} className="text-white" />
              }
              ariaLabel="分享至 LINE"
              onClick={() => handleShare("line")}
            />
            <ShareBlock
              bg="bg-[#3B5998]"
              icon={
                <Icons.Facebook width={28} height={28} className="text-white" />
              }
              ariaLabel="分享至 Facebook"
              onClick={() => handleShare("facebook")}
            />
            <ShareBlock
              bg="bg-[#E04F3F]"
              icon={
                <Icons.Mail width={28} height={28} className="text-white" />
              }
              ariaLabel="透過 Email 分享"
              onClick={() => handleShare("mail")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 🌟 改為 button 標籤並加上 aria-label */
function ShareBlock({ bg, icon, onClick, ariaLabel }) {
  return (
    <button
      aria-label={ariaLabel}
      className={`${bg} flex items-center justify-center cursor-pointer hover:brightness-110 transition-all active:brightness-95 w-full h-full border-none`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
