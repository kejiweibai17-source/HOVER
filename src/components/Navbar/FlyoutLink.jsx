import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ToggleMenu from "../MenuFade";
const Example = () => {
  return (
    <div className="flex justify-center bg-white border-b-1 border-gray-100 shadow-lg px-3 py-4">
      <FlyoutLink href="#" FlyoutContent={PricingContent}>
        <span className="font-bold text-[1.05rem] text-black px-4">
          旅遊景點
        </span>
      </FlyoutLink>
      <FlyoutLink href="#" FlyoutContent={PricingContent}>
        <span className="font-bold text-[1.05rem] text-black px-4">
          包車方案
        </span>
      </FlyoutLink>
      <FlyoutLink href="#" FlyoutContent={PricingContent}>
        <span className="font-bold text-[1.05rem] text-black px-4">
          美食景點
        </span>
      </FlyoutLink>
      <FlyoutLink href="#" FlyoutContent={PricingContent}>
        <span className="font-bold text-[1.05rem] text-black px-4">
         伴手禮/文創特色
        </span>
      </FlyoutLink>
      <FlyoutLink href="#" FlyoutContent={PricingContent}>
        <span className="font-bold text-[1.05rem] text-black px-4">
          最新消息
        </span>
      </FlyoutLink>
      <ToggleMenu />
    </div>
  );
};

const FlyoutLink = ({ children, href, FlyoutContent }) => {
  const [open, setOpen] = useState(false);
  const showFlyout = FlyoutContent && open;

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="relative w-fit h-fit"
    >
      <a href={href} className="relative text-white">
        {children}
        <span
          style={{
            transform: showFlyout ? "scaleX(1)" : "scaleX(0)",
            background:
              "linear-gradient(90deg, rgba(0, 99, 65, 1) 0%, rgba(162, 199, 87, 1) 100%)",
          }}
          className="absolute -bottom-2 -left-2 -right-2 h-1 origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out"
        />
      </a>

      <AnimatePresence>
        {showFlyout && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute left-0 top-full mt-4 z-50"
          >
            <FlyoutContent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PricingContent = () => {
  return (
    <div className=" bg-white p-10 border border-gray-200  w-[400px] shadow-md z-50">
      <div className="mb-3 space-y-3">
        <h3 className="font-semibold">For Individuals</h3>
        <a href="#" className="block text-sm hover:underline">
          Introduction
        </a>
        <a href="#" className="block text-sm hover:underline">
          Pay as you go
        </a>
      </div>
      <div className="mb-6 space-y-3">
        <h3 className="font-semibold">For Companies</h3>
        <a href="#" className="block text-sm hover:underline">
          Startups
        </a>
        <a href="#" className="block text-sm hover:underline">
          SMBs
        </a>
        <a href="#" className="block text-sm hover:underline">
          Enterprise
        </a>
      </div>
      <button className="w-full rounded-lg border-2 border-neutral-950 px-4 py-2 font-semibold transition-colors hover:bg-neutral-950 hover:text-white">
        Contact sales
      </button>
    </div>
  );
};

export default Example;
