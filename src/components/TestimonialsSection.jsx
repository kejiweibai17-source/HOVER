"use client";

import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";

export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "我選擇UFLOW肽晶芙蓉-營養補給複方安心選擇！ ",
      name: "專業驗光師大推",
      designation: "Professional Optometrist",
      src: "/images/檢驗/1.png",
    },
    {
      quote: "熬夜、日曬族的養顏美容營養補給新選擇 ",
      name: "營養師大讚",
      designation: "Professional Nutritionist",
      src: "/images/檢驗/2.png",
    },
    {
      quote: "四大專利複方養顏好吸收 ",
      name: "美麗營養師推薦",
      designation: "Professional Nutritionist",
      src: "/images/檢驗/3.png",
    },
  ];

  // 定義三張裝飾圖片 (Tags)
  // 關鍵修改：使用 RWD 前綴 (md:) 來區分手機與電腦的定位
  const myDecorativeImages = [
    {
      src: "/images/檢驗/tag01.png",
      // 手機: 縮小寬度(w-20)，位置微調
      // 電腦(md): 寬度正常(md:w-[100px])，位置偏移更大
      className:
        "top-[-20px] right-[-10px] w-40 rotate-12 md:top-[-40px] md:right-[-20px] md:w-[170px]",
      width: 160,
      height: 100,
    },
    {
      src: "/images/檢驗/tag-02.png",
      // 手機: 靠左下，稍微小一點
      // 電腦(md): 往左突出更多
      className:
        "bottom-[10px] left-[-10px] w-24 -rotate-6 md:bottom-[20px] md:left-[-30px] md:w-[120px]",
      width: 120,
      height: 120,
    },
    {
      src: "/images/檢驗/tag-05.png",
      // 手機: 靠上方中間
      className:
        "top-[-15px] left-[15%] w-16 rotate-[-10deg] md:top-[-20px] md:left-[20%] md:w-[80px]",
      width: 80,
      height: 80,
    },
  ];

  return (
    // 外層 overflow-hidden 非常重要，避免 tag 圖片超出螢幕寬度導致頁面可以左右滑動
    <div className="pb-[80px] md:pb-[180px] pt-[20px] md:pt-[10px]  ">
      <AnimatedTestimonials
        testimonials={testimonials}
        decorativeImages={myDecorativeImages}
        autoplay={true}
      />
    </div>
  );
}
