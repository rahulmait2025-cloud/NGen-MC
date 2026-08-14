"use client";

import { useState } from "react";

export default function TiltedVideoSurface() {
  const [videoError, setVideoError] = useState(false);
  const videoSrc = "/videos/cto-bhaiya-youtube-scroll.mp4";

  return (
    <div 
      className="pointer-events-none relative h-full w-full overflow-hidden bg-white"
      style={{
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 70%, transparent 95%)",
        maskImage:
          "linear-gradient(to bottom, black 0%, black 70%, transparent 95%)",
      }}
    >
      <div
        className="video-surface-plane absolute max-w-none transform-gpu"
        style={{
          left: "50%",
          top: "-70px",
          width: "min(1800px, 145vw)",
          aspectRatio: "16 / 9",
          transform: "translateX(-50%) perspective(2200px) rotateX(68deg) rotateZ(-8deg) scale(0.92)",
          transformOrigin: "top center",
          transformStyle: "preserve-3d",
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      >
        {!videoError ? (
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="block h-auto w-full max-w-none"
            style={{
              aspectRatio: "16 / 9",
              objectFit: "cover",
              objectPosition: "center top",
              opacity: 0.97,
            }}
            onError={() => setVideoError(true)}
          />
        ) : (
          <div
            className="block w-full h-auto aspect-video bg-neutral-100"
            style={{ opacity: 0.96 }}
          />
        )}
      </div>

      {/* Fade overlays — ensure no visible rectangular boundaries */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Top fade — gentle blend from text zone */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white via-white/30 to-transparent" />

        {/* Left fade — wide blend to hide side boundary */}
        <div className="absolute inset-y-0 left-0 w-[18%] bg-gradient-to-r from-white via-white/22 to-transparent" />

        {/* Right fade — subtle blend for right boundary */}
        <div className="absolute inset-y-0 right-0 w-[8%] bg-gradient-to-l from-white/35 to-transparent" />

        {/* Bottom fade — strong tall blend to dissolve the lower tilted edge */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/70 to-transparent" />
      </div>
    </div>
  );
}
