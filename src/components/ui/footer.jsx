import Logo from "./logo";
// import { Cloudinary } from "@cloudinary/url-gen";
import Image from "next/image";

import footerMobile from "./footerMobile.jsx";
import { Import } from "lucide-react";
import Link from "next/link";

// const myLoader = ({ src, width, quality, placeholder }) => {
//   return `https://www.ultraehp.com/images/Products-Detail-Img/UH-2/${src}?w=${width}?p=${placeholder}`
// }

const myLoader = ({ src, width, quality, placeholder }) => {
  return `https://www.ultraehp.com/images/footer/${src}?w=${width}?p=${placeholder}`;
};

export default function Footer() {
  return (
    <div className="block">
      <footer className="md:py-[80px] py-[20px] 2xl:py-[50px] lg:pb-[50px] lg:pt-[30px] w-full px-[15px] md:px-[30px] lg:px-[90px]  2xl:px-[200px] bg-[#e0d5c8]  flex-col items-center  flex justify-center">
        <div className="top-section p-[30px] lg:p-[10px] w-full ">
          <div className="link-button-wrap flex flex-wrap  mx-auto w-full md:w-[630px]  justify-center ">
            <Image
              placeholder="empty"
              alt="soke"
              className="ml-[50px]"
              src="/images/S__4767763.jpg"
              width={900}
              height={400}
            />
          </div>
        </div>
        <div className="flex justify-center items-center">
          <a
            href="https://www.jeek-webdesign.com.tw"
            target="_blank"
            className="border-none text-[13px] 2xl:text-[16px] font-light text-[#666666]"
          >
            © 2025 Jeek. All Rights Reserved. Design by Jeek.
          </a>
        </div>
      </footer>
    </div>
  );
}
