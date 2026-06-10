"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, ChevronRight, ExternalLink } from "lucide-react";
import TestimonialsSection from "@/components/TestimonialsSection";

// --- Google Drive 連結轉換工具 (不用動它) ---
// 自動將 "view?usp=sharing" 轉為 "preview" 以便嵌入
const getEmbedUrl = (url) => {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    return url.replace(/\/view.*/, "/preview").replace(/\/edit.*/, "/preview");
  }
  return url;
};

// --- 資料結構 (請填入 Google Drive 的「共用連結」) ---
const INSPECTION_DATA = [
  {
    id: "peptides",
    label: "肽晶芙蓉檢驗",
    subCategories: [
      {
        title: "台美西藥M61 ",
        items: [
          {
            name: "台美西藥M61-260101310-肽晶芙蓉-1",
            // 範例：請換成您真實檔案的連結
            url: "https://drive.google.com/file/d/1FMUy3AFr53SsUaNTp7Hvr44EH9WSlci_/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101310-肽晶芙蓉-2",
            url: "https://drive.google.com/file/d/1h0Yo0c4gbw4o_8ZlU-FCeioq04U6iFkD/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101310-肽晶芙蓉-3",
            url: "https://drive.google.com/file/d/1ZhxR3cVQjFXUL4KDFMoO3X2nTcGMOKY9/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101310-肽晶芙蓉-4",
            url: "https://drive.google.com/file/d/1YrYKGqjOOmEfhxn7k9aTRnZk3NZVnV9r/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101310-肽晶芙蓉-5",
            url: "https://drive.google.com/file/d/1NNgs3d2QPUjmlqwXNxVzHuW6uXCTvLcC/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101310-肽晶芙蓉-6",
            url: "https://drive.google.com/file/d/1ZDMeHhWne3HhP9G0QqDd8EbXg-QB-apr/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101310-肽晶芙蓉-7",
            url: "https://drive.google.com/file/d/17rSuTqmDk5TIpqK2Oi-hHXDUiMAOAXWN/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101310-肽晶芙蓉-8",
            url: "https://drive.google.com/file/d/1FtsxFaxT9PT_n7zZ-RKIb1PmgpwOmibk/view?usp=share_link",
          },
        ],
      },
      {
        title: "台美農殘M61",
        items: [
          {
            name: "台美農殘M61-260101311-肽晶芙蓉-1",
            url: "https://drive.google.com/file/d/1oH-RMPoRpwzdQCJebBp_WreV2jV08o_z/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101311-肽晶芙蓉-2",
            url: "https://drive.google.com/file/d/1ITk6IlA_9RMN3KwQlR36mSdEU2eVZsJh/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101311-肽晶芙蓉-3",
            url: "https://drive.google.com/file/d/11__zS_LerZ10T9oQ7XZOt63YMKwnYrZe/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101311-肽晶芙蓉-4",
            url: "https://drive.google.com/file/d/19JwipUP6c_o5MjzUyJWI_xle0yN3e6_K/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101311-肽晶芙蓉-5",
            url: "https://drive.google.com/file/d/1Sgy9V0IgM1yFcCwGfSaU6EeZITfclf5B/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101311-肽晶芙蓉-6",
            url: "https://drive.google.com/file/d/1dzmIoDdAr4j2195iDZYrNsgxYBkDSkia/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101311-肽晶芙蓉-7",
            url: "https://drive.google.com/file/d/14bnX2XAlpRB9Lc90zf_0oijimOcQ9jR6/view?usp=share_link",
          },
        ],
      },
      {
        title: "明嘉微生物M2512301",
        items: [
          {
            name: "明嘉微生物M2512301-肽晶芙蓉",
            url: "https://drive.google.com/file/d/105IZkpu-OufjLVZIhN4ThVJpVD33-zSS/view?usp=share_link",
          },
        ],
      },
      {
        title: "SGS種金屬PUF26100836 ",
        items: [
          {
            name: "SGS種金屬PUF26100836-肽晶芙蓉-1",
            url: "https://drive.google.com/file/d/14oWFBIdl3VbErgiIj8i0anvrYqYkP5Zu/view?usp=share_link",
          },
          {
            name: "SGS種金屬PUF26100836-肽晶芙蓉-2",
            url: "https://drive.google.com/file/d/1e4UOIt7PoLPYKBCNLc4uoIUpOiT4TYXr/view?usp=share_link",
          },
          {
            name: "SGS種金屬PUF26100836-肽晶芙蓉-3",
            url: "https://drive.google.com/file/d/1flyCYl4n5ZZsB-uT_NRoaocqRB_V-1j3/view?usp=share_link",
          },
          {
            name: "SGS種金屬PUF26100836-肽晶芙蓉-4",
            url: "https://drive.google.com/file/d/1q6rKAhJnZ3-hfI_SCijRcd_MczG_hQze/view?usp=share_link",
          },
        ],
      },
    ],
  },
  {
    id: "probiotics",
    label: "維他菌合生元檢驗",
    subCategories: [
      {
        title: "台美西藥M61-260101314",
        items: [
          {
            name: "台美西藥M61-260101314-維他菌合生元-1",
            url: "https://drive.google.com/file/d/1RYUB8kOUUSCS7U_WPyrlY4ga5bBk1_mR/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101314-維他菌合生元-1",
            url: "https://drive.google.com/file/d/154zh5VqQ8oUaqn7MS8A1n9dmeCbGU7te/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101314-維他菌合生元-1",
            url: "https://drive.google.com/file/d/12T_eNcY_z1ledxP_2tbKrM5C2fsLVmuZ/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101314-維他菌合生元-1",
            url: "https://drive.google.com/file/d/1MoFQPfxCFhOCmYlGM8BIu1Ch0F6xqw-r/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101314-維他菌合生元-1",
            url: "https://drive.google.com/file/d/10keO4AWohdqrWt2noSC4F1WkPjTKPnXT/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101314-維他菌合生元-1",
            url: "https://drive.google.com/file/d/1QczvTETj55G9s42tyqhmKq9rsxt0BwSy/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101314-維他菌合生元-1",
            url: "https://drive.google.com/file/d/1d7RTHrI1DsWxAFsTopAi2tHVJCyWV5VP/view?usp=share_link",
          },
          {
            name: "台美西藥M61-260101314-維他菌合生元-1",
            url: "https://drive.google.com/file/d/1bPy4T4bDEVZK4UW8NLCqFjj0vy9b6mku/view?usp=share_link",
          },
        ],
      },
      {
        title: "台美農殘M61-260101315",
        items: [
          {
            name: "台美農殘M61-260101315-維他菌合生元-1",
            url: "https://drive.google.com/file/d/1AR4cGgoJPeWf8VaLWe-VgRXWY5mGwAFG/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101315-維他菌合生元-2",
            url: "https://drive.google.com/file/d/1FVrnMNL0j47QsXBYDzYgeugtLySLjTMv/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101315-維他菌合生元-3",
            url: "https://drive.google.com/file/d/15jAwO_SHQA_piC0v5K1Y8HEcqoZBeiau/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101315-維他菌合生元-4",
            url: "https://drive.google.com/file/d/1XTZwocgSKQ_SSu74_QoqhnQeEC8pE-eP/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101315-維他菌合生元-5",
            url: "https://drive.google.com/file/d/16L9V9YLnSAc14hXRAgxmXZPa24sBBvra/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101315-維他菌合生元-6",
            url: "https://drive.google.com/file/d/1VsFdgS3ZjWrbrjHoNiPvB_RVgjWyDDPa/view?usp=share_link",
          },
          {
            name: "台美農殘M61-260101315-維他菌合生元-7",
            url: "https://drive.google.com/file/d/1Tjp5aM8uQ5dDv7rbZDWvu7-XreUcewAi/view?usp=share_link",
          },
        ],
      },
      {
        title: "SGS重金屬&微生物PUF26100838",
        items: [
          {
            name: "SGS重金屬&微生物PUF26100838-維他菌合生元-1",
            url: "https://drive.google.com/file/d/1b1DD1FcRT2d7EVnwOus1w0EaY3rTc4B2/view?usp=share_link",
          },
          {
            name: "SGS重金屬&微生物PUF26100838-維他菌合生元-2",
            url: "https://drive.google.com/file/d/169JhoouTPRDZ_o5G8mfPKq5Scd_RgSKE/view?usp=share_link",
          },
          {
            name: "SGS重金屬&微生物PUF26100838-維他菌合生元-3",
            url: "https://drive.google.com/file/d/1jfAsGLa6D404vxFmb1XemabCeOmYBt8X/view?usp=share_link",
          },
          {
            name: "SGS重金屬&微生物PUF26100838-維他菌合生元-4",
            url: "https://drive.google.com/file/d/1w5lQUgP-pvxzcOrCuiHKsaGPEWU-Joy8/view?usp=share_link",
          },
        ],
      },
    ],
  },
];

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState(INSPECTION_DATA[0].id);
  const [selectedFile, setSelectedFile] = useState(null); // 改名為 File 比較直覺

  const currentTabContent = INSPECTION_DATA.find((tab) => tab.id === activeTab);

  return (
    <div className="pt-20 mt-20 bg-gray-50 min-h-screen">
      {/* 上方 Banner (維持電腦版顯示) */}

      {/* 主要內容區域 */}
      <section className="mx-auto max-w-[1400px] px-4 md:px-8 pb-20 pt-10 md:pt-0">
        <div className="title pb-5 md:pb-10">
          <h1 className="text-3xl md:text-5xl font-bold py-6 text-gray-800">
            檢驗認證
          </h1>
          <hr className="border-gray-300" />
        </div>

        {/* --- Tabs 按鈕區 (可橫向滑動) --- */}
        <div className="flex overflow-x-auto pb-2 mb-6 md:mb-10 border-b border-gray-200 gap-2 md:gap-4 no-scrollbar">
          {INSPECTION_DATA.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-base md:text-lg font-medium transition-colors duration-300 rounded-t-lg whitespace-nowrap flex-shrink-0
                ${
                  activeTab === tab.id
                    ? "text-pink-600 bg-white shadow-sm border border-b-0 border-gray-200"
                    : "text-gray-500 hover:text-pink-400 hover:bg-gray-100"
                }
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabLine"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-pink-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* --- 列表內容區 (全文字清單模式) --- */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-4 md:p-10 rounded-2xl shadow-sm border border-gray-100"
        >
          {currentTabContent?.subCategories.map((subCat, index) => (
            <div key={index} className="mb-8 md:mb-12 last:mb-0">
              {/* 次分類標題 */}
              <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-4 md:mb-6 flex items-center">
                <span className="w-1.5 md:w-2 h-6 md:h-8 bg-pink-500 rounded-full mr-3"></span>
                {subCat.title}
              </h3>

              {/* 統一排版：電腦與手機皆使用 Grid 排列文字按鈕 
                 手機 1 欄，平板 2 欄，電腦 3 欄
              */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {subCat.items.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedFile(item)}
                    className="
                      group cursor-pointer 
                      flex items-center justify-between 
                      p-4 md:p-5
                      bg-gray-50 hover:bg-white 
                      border border-gray-200 hover:border-pink-300 hover:shadow-md
                      rounded-xl transition-all duration-300
                      active:scale-95 md:active:scale-[0.98]
                    "
                  >
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      {/* 文件 Icon */}
                      <div className="p-2 bg-white rounded-full text-pink-500 shadow-sm group-hover:bg-pink-50 transition-colors shrink-0">
                        <FileText size={20} />
                      </div>

                      {/* 檔名文字 */}
                      <h4 className="font-medium text-gray-700 group-hover:text-pink-600 transition-colors truncate">
                        {item.name}
                      </h4>
                    </div>

                    {/* 箭頭 Icon */}
                    <ChevronRight
                      className="text-gray-400 group-hover:text-pink-400 transition-colors shrink-0"
                      size={18}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* --- Google Drive 預覽 Popup --- */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFile(null)}
            className="fixed inset-0 z-[99999999999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-8"
          >
            {/* 關閉按鈕 */}
            <button
              onClick={() => setSelectedFile(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/30 rounded-full text-white transition-colors"
            >
              <X size={32} />
            </button>

            {/* Popup 本體 */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="  w-full max-w-5xl mt-20 !z-[9999999999999999] static h-[85vh] md:h-[95vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* 頂部標題列 */}
              <div className="p-3 md:p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                <h3 className="text-base md:text-lg font-bold text-gray-800 truncate pr-4">
                  {selectedFile.name}
                </h3>
                {/* 另開視窗按鈕 (備用，以防 iframe 在某些手機瀏覽器有問題) */}
                <a
                  href={selectedFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 font-medium px-3 py-1 rounded-md hover:bg-pink-50 transition-colors"
                >
                  下載 / 另開 <ExternalLink size={14} />
                </a>
              </div>

              {/* Google Drive Iframe 區域 */}
              <div className="flex-1 w-full bg-gray-200 relative">
                {/* 載入中的提示 (iframe 蓋過來之前看得到) */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  載入文件預覽中...
                </div>

                <iframe
                  src={getEmbedUrl(selectedFile.url)}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="autoplay"
                  title="PDF Preview"
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
