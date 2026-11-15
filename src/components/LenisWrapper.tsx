"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode, useEffect, useState } from "react";

/**
 * 僅桌機（寬螢幕 + 精準指標）啟用 Lenis。
 * 手機／觸控改原生捲動，避免頁尾邊界與平滑插值打架造成卡晃。
 */
const LENIS_DESKTOP_MQ =
  "(min-width: 768px) and (hover: hover) and (pointer: fine)";

export default function LenisWrapper({ children }: { children: ReactNode }) {
  const [enableLenis, setEnableLenis] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(LENIS_DESKTOP_MQ);
    const sync = () => setEnableLenis(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!enableLenis) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.14,
        smoothWheel: true,
        wheelMultiplier: 1,
        syncTouch: false,
        touchMultiplier: 1,
      }}
    >
      {children}
    </ReactLenis>
  );
}
