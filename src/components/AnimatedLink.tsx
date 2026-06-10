"use client";

import Link from "next/link";
import { useTransitionRouter } from "next-view-transitions";

// ✅ 新的換頁動畫：縮小 + 往上離場、新頁往下進場
const pageAnimation = () => {
  // 離開動畫
  document.documentElement.animate(
    [
      {
        opacity: 1,
        scale: 1,
        transform: "translateY(0)",
      },
      {
        opacity: 0.5,
        scale: 0.9,
        transform: "translateY(-100px)",
      },
    ],
    {
      duration: 1000,
      easing: "cubic-bezier(0.76, 0, 0.24, 1)",
      fill: "forwards",
      pseudoElement: "::view-transition-old(root)",
    },
  );

  // 進場動畫
  document.documentElement.animate(
    [
      {
        transform: "translateY(100%)",
      },
      {
        transform: "translateY(0)",
      },
    ],
    {
      duration: 1000,
      easing: "cubic-bezier(0.76, 0, 0.24, 1)",
      fill: "forwards",
      pseudoElement: "::view-transition-new(root)",
    },
  );
};

const Nav = () => {
  const router = useTransitionRouter();

  const routes = [
    { label: "Home", url: "/" },
    { label: "About", url: "/about" },
  ];

  return <nav className="p-6"></nav>;
};

export default Nav;
