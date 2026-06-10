"use client";
import { useEffect, useRef } from "react";

export default function YouTubeHoverPlayer({ videoId }) {
  const iframeRef = useRef(null);

  // 建立 player 物件
  const postToPlayer = (action) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    iframe.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: action,
        args: [],
      }),
      "*"
    );
  };

  return (
    <div
      className="w-full h-full"
      onMouseEnter={() => postToPlayer("playVideo")}
      onMouseLeave={() => postToPlayer("pauseVideo")}
    >
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&playsinline=1&controls=0&rel=0`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
