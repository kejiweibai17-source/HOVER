"use client";

import { useRef } from "react";
import ScrollAnimate from "../../components/ScrollAnimation/page.jsx";
// import SvgImg from "../../components/SVGImage.jsx";
// import HeroSlider from "../../components/HeroSlideContact/page";
import { Accordion, AccordionItem } from "@heroui/react";
import Character from "../../components/TextOpacityScroll/Character.jsx";
import GsapText from "../../components/RevealText/index";
import MotionImage from "../../components/MotionImage.jsx";

import Swiper from "../../components/SwiperCarousel/SwiperCardFood.jsx";
import Image from "next/image";
// import HoverCard from "../../components/HoverCardBuild/index";
import gsap from "gsap";
import MindCarouselBanner from "../../components/MindCarouselBanner.jsx";
// import { PlaceholdersAndVanishInput } from "../../components/ui/placeholders-and-vanish-input.js";
// import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
// import ImageDistortion from "../../components/ImageDistortion/page.jsx";

const QaClient = () => {
  gsap.registerPlugin(CustomEase);

  const placeholders = [
    "理想的家，該具備哪些元素？",
    "選擇房子時，你最在意什麼？",
    "如何找到兼具品質與舒適的住宅？",
    "買房是投資還是生活選擇？",
    "未來的家，會是什麼模樣？",
  ];

  const handleChange = (e) => {
    console.log(e.target.value);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    console.log("submitted");
  };

  return (
    <>
      <main className="bg-[#EAEFF1] pt-20">
        <MindCarouselBanner />
        {/* 上方大圖，稍微加個 padding 比較不會貼邊 */}
        <section className="px-4 lg:px-10">
          <div>
            <img
              src="/images/素材/img/合作.png"
              className="mx-auto w-full md:w-[85%] xl:w-[70%]"
              alt=""
            />
          </div>
        </section>

        {/* 第二個 section：金牌大使（白底右側半圓，維持原 UI） */}
        <section className="mt-10 px-4 lg:px-10">
          <div className="mx-auto">
            <div className="bg-white w-full md:w-[90vw] mx-auto rounded-3xl md:rounded-tr-full md:rounded-br-full">
              <div className="mx-auto flex max-w-[1400px] flex-col md:flex-row p-6 md:p-8">
                {/* 左側文字：小螢幕佔滿、桌機 1/2 */}
                <div className="left w-full md:w-1/2 flex justify-center items-center p-4 md:p-8">
                  <div className="description">
                    <h2 className="font-bold text-3xl md:text-5xl mb-4 md:mb-5">
                      金牌大使
                    </h2>
                    <p className="leading-relaxed md:leading-loose text-sm md:text-base">
                      當親友使用您個人的
                      [專使推薦連結]，註冊成為新會員，並且完成第一筆消費，大使即可獲得
                      $200 元抵用金，用於折抵下次訂單金額！
                      <br />
                      <br />
                      1.
                      登入您的帳戶，前往您的專屬推薦頁面，將您的專屬優惠連結分享給親友。
                      <br />
                      2. 當您的親友使用您的好友優惠連結於 UFLOW
                      註冊新帳號，親友即可立刻獲得「50 元」購物金。
                      <br />
                      3. 當好友完成第一筆消費，您即獲得 $200
                      元購物金，可用於折抵下次訂單金額。
                    </p>
                  </div>
                </div>

                {/* 右側黑框：維持原本造型，RWD 下改為佔滿寬度 */}
                <div className="right w-full md:w-1/2 flex items-center">
                  <div className="w-full h-40 md:h-64 lg:h-80 rounded-[40px] md:rounded-[60px] border-4 border-black" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 第三個 section：底圖 + 浮在上面的白卡片（維持原 UI，RWD 優化） */}
        <section className="mb-[160px] md:mb-[200px] mt-10 px-4 lg:px-10">
          <div className="relative mx-auto">
            {/* 白色卡片：手機改成正常排版，桌機才用 absolute 壓在圖上 */}
            <div className="relative z-30 w-full md:w-[70vw] md:absolute md:left-0 md:bottom-[-10%]">
              <div className="bg-white border-4 border-gray-500 rounded-3xl md:rounded-tr-full md:rounded-br-full">
                <div className="mx-auto flex max-w-[1400px] flex-col md:flex-row p-6 md:p-8">
                  {/* 右側黑框：桌機放左邊、手機在上方（照你原來 right / left 的結構） */}
                  <div className="right w-full md:w-1/2 flex items-center order-1 md:order-1">
                    <div className="w-full h-40 md:h-64 lg:h-80 rounded-[40px] md:rounded-[60px] border-4 border-black" />
                  </div>

                  {/* 左側文字：手機在下方、桌機在右邊 */}
                  <div className="left w-full md:w-1/2 flex justify-center items-center p-4 md:p-8 order-2 md:order-2">
                    <div className="description">
                      <h2 className="font-bold text-3xl md:text-5xl mb-4 md:mb-5">
                        金牌大使
                      </h2>
                      <p className="leading-relaxed md:leading-loose text-sm md:text-base">
                        當親友使用您個人的
                        [專使推薦連結]，註冊成為新會員，並且完成第一筆消費，大使即可獲得
                        $200 元抵用金，用於折抵下次訂單金額！
                        <br />
                        <br />
                        1.
                        登入您的帳戶，前往您的專屬推薦頁面，將您的專屬優惠連結分享給親友。
                        <br />
                        2. 當您的親友使用您的好友優惠連結於 UFLOW
                        註冊新帳號，親友即可立刻獲得「50 元」購物金。
                        <br />
                        3. 當好友完成第一筆消費，您即獲得 $200
                        元購物金，可用於折抵下次訂單金額。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部大圖：維持 16/6 感覺，RWD 改成合理比例 */}
            <div className="relative mt-8 md:mt-0 overflow-hidden rounded-3xl">
              <div className="relative aspect-[16/10] md:aspect-[16/6] w-full">
                <img
                  src="https://coralclub.ru//upload/iblock/7b7/x6c6j3dyu69ud3j02yov2bc0sa21nm5d.webp"
                  className="w-full h-full object-fill"
                  alt=""
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Hero 區塊 */}
      {/* <section className="section_hero">
        <HeroSlider />
      </section> */}
    </>
  );
};

export default QaClient;
