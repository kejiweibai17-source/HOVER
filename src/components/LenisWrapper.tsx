"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode } from "react";

export default function LenisWrapper({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.14,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.2,
      }}
    >
      {children}
    </ReactLenis>
  );
}
