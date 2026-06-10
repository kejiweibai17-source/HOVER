import React from "react";
import Content from "./Content";

export default function Footer() {
  return (
    // 移除所有 sticky, h-[...], clipPath 等複雜設定
    // 改為標準的相對定位容器，讓高度由內容 (Content) 自動撐開
    <div className="relative w-full z-10 bg-[#EDEEEF]">
      <Content />
    </div>
  );
}