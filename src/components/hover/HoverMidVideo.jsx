"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import {
  DEFAULT_MID_VIDEO,
  isMidVideoActive,
  normalizeMidVideoSettings,
} from "@/lib/midVideoDefaults";

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return mobile;
}

export default function HoverMidVideo({ initialSettings = null }) {
  const [settings, setSettings] = useState(() =>
    initialSettings
      ? normalizeMidVideoSettings(initialSettings)
      : DEFAULT_MID_VIDEO,
  );
  const [ready, setReady] = useState(Boolean(initialSettings));
  const isMobile = useIsMobile();
  const videoRef = useRef(null);

  useEffect(() => {
    if (initialSettings) return undefined;
    let cancelled = false;
    fetch("/api/mid-video")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSettings(normalizeMidVideoSettings(data?.midVideo));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  const media = isMobile ? settings.mobile : settings.desktop;
  const videoUrl = media.videoUrl || settings.desktop.videoUrl;
  const posterUrl = media.posterUrl || settings.desktop.posterUrl;
  const href = settings.href || "/products";

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl) return undefined;

    el.muted = settings.muted;
    el.defaultMuted = settings.muted;
    if (settings.muted) el.setAttribute("muted", "");
    el.loop = settings.loop;
    el.playsInline = true;

    if (settings.autoplay) {
      const play = () => {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };
      play();
      el.addEventListener("canplay", play);
      return () => el.removeEventListener("canplay", play);
    }

    el.pause();
    return undefined;
  }, [videoUrl, settings.autoplay, settings.muted, settings.loop, isMobile]);

  if (!ready || !isMidVideoActive(settings)) return null;

  const content = (
    <div
      className="relative w-full overflow-hidden bg-black
        h-[min(100dvh,177.78vw)] max-h-[100dvh]
        md:h-[min(100dvh,56.25vw)] md:max-h-[100dvh]"
    >
      {videoUrl ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={videoUrl}
          poster={posterUrl || undefined}
          muted={settings.muted}
          loop={settings.loop}
          playsInline
          autoPlay={settings.autoplay}
          preload="metadata"
          controls={false}
          disablePictureInPicture
        />
      ) : posterUrl ? (
        <Image
          src={posterUrl}
          alt={settings.title || "HOVER"}
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-[#1a1a1a]" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

      {(settings.title || settings.body) && (
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-20 text-center text-white md:px-12 md:pb-12 md:pt-16 md:text-left">
          {settings.title && (
            <h2 className="text-[20px] font-semibold tracking-[0.04em] md:text-[32px]">
              {settings.title}
            </h2>
          )}
          {settings.body && (
            <p className="mx-auto mt-2 max-w-[320px] whitespace-pre-line text-[13px] leading-relaxed text-white/90 md:mx-0 md:mt-3 md:max-w-[480px] md:text-[15px]">
              {settings.body}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (!href) {
    return <section className="w-full bg-black">{content}</section>;
  }

  if (href.startsWith("http")) {
    return (
      <section className="w-full bg-black">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          aria-label={settings.title || "觀看更多"}
        >
          {content}
        </a>
      </section>
    );
  }

  return (
    <section className="w-full bg-black">
      <Link href={href} className="block" aria-label={settings.title || "觀看更多"}>
        {content}
      </Link>
    </section>
  );
}
