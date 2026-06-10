import React from "react";
import EmblaCarousel from "./EmblaCarousel";

const OPTIONS = { dragFree: true, loop: true };

// UFLOW 產品輪播資料
const SLIDES = [
  // --- 1. GABA 鎂鎂香蜂草 ---
  {
    image: "/images/GABA鎂鎂香蜂草.png",
    title: "GABA 鎂鎂香蜂草",
    link: "/products/gaba鎂鎂香蜂草", // 👈 加上專屬連結 (請依據實際 slug 修改)
    shortDescription: "舒緩放鬆，重拾夜間寧靜。",
    description:
      "結合韓國 GABA、義大利 SideMag® 鎂與法國香蜂草萃取。科學調配，幫助入睡。",
    tags: ["睡眠支援", "放鬆", "鎂"],
    publishDate: "Hot Sale",
    region: "Global Patents",
  },
  // --- 2. 維他菌合生元 ---
  {
    image: "/images/維他菌-合生元.png",
    title: "次世代維他菌合生元",
    link: "/products/synbiotics", // 👈 加上專屬連結
    shortDescription: "4大益生菌 + 益生質 + 後生元，全方位保養。",
    description:
      "打造消化道健康生態圈。添加專利配方，維持各年齡層的順暢與保護力，每日一包，健康輕鬆補給。",
    tags: ["消化道健康", "益生菌", "合生元"],
    publishDate: "New Arrival",
    region: "Synbiotics",
  },
  // --- 3. 冰晶芙蓉 ---
  {
    image: "/images/00912.png",
    title: "肽晶芙蓉",
    link: "/products/肽晶芙蓉", // 👈 加上專屬連結
    shortDescription: "煥發光采，由內而外的透亮自信。",
    description:
      "專為美麗設計，滋補養顏，維持青春美麗。讓每一天都像盛開的芙蓉般耀眼迷人。",
    tags: ["養顏美容", "青春光采", "植萃"],
    publishDate: "Best Seller",
    region: "Beauty",
  },
  // --- 重複資料以維持輪播數量 ---
  {
    image: "/images/GABA鎂鎂香蜂草.png",
    title: "GABA 鎂鎂香蜂草",
    link: "/products/gaba-magnesium", // 👈 對應連結
    shortDescription: "舒緩放鬆，重拾夜間寧靜。",
    description:
      "結合韓國 GABA、義大利 SideMag® 鎂與法國香蜂草萃取。科學調配，幫助入睡。",
    tags: ["睡眠支援", "放鬆", "鎂"],
    publishDate: "Hot Sale",
    region: "Global Patents",
  },
  {
    image: "/images/維他菌-合生元.png",
    title: "次世代維他菌合生元",
    link: "/products/synbiotics", // 👈 對應連結
    shortDescription: "4大益生菌 + 益生質 + 後生元，全方位保養。",
    description:
      "打造消化道健康生態圈。添加專利配方，維持各年齡層的順暢與保護力，每日一包，健康輕鬆補給。",
    tags: ["消化道健康", "益生菌", "合生元"],
    publishDate: "New Arrival",
    region: "Synbiotics",
  },
  {
    image: "/images/00912.png",
    title: "肽晶芙蓉",
    link: "/products/肽晶芙蓉", // 👈 對應連結
    shortDescription: "煥發光采，由內而外的透亮自信。",
    description:
      "專為美麗設計，滋補養顏，維持青春美麗。讓每一天都像盛開的芙蓉般耀眼迷人。",
    tags: ["養顏美容", "青春光采", "植萃"],
    publishDate: "Best Seller",
    region: "Beauty",
  },
];

const App = () => (
  <>
    <main className="w-full flex items-center justify-center pb-20 overflow-hidden">
      <div className="w-full max-w-[1600px] mx-auto">
        <EmblaCarousel slides={SLIDES} options={OPTIONS} />
      </div>
    </main>
  </>
);

export default App;
