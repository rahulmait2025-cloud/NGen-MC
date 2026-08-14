"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export default function TiltedVideoMockup() {
  const [videoError, setVideoError] = useState(false);
  const videoSrc = "/videos/cto-bhaiya-youtube-scroll.mp4";

  return (
    <div className="relative w-full lg:transform-gpu lg:-rotate-[11deg]">
      {/* Main Browser Mockup Card */}
      <div className="relative w-full rounded-[20px] lg:rounded-[28px] border border-black/5 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.12)] overflow-hidden">
        
        {/* Browser Top Bar */}
        <div className="relative h-10 lg:h-12 bg-white flex items-center px-4 lg:px-6 gap-2 z-20 border-b border-black/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-[#27C93F]" />
          </div>
          <div className="ml-4 h-5 lg:h-6 w-full max-w-[200px] lg:max-w-[300px] bg-black/5 rounded-md" />
        </div>

        {/* Video or Fallback */}
        <div className="relative bg-white w-full">
          {!videoError ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-[260px] sm:h-[320px] lg:h-[700px] object-cover object-top"
              onError={() => setVideoError(true)}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          ) : (
            <div className="w-full h-[260px] sm:h-[320px] lg:h-[700px] flex flex-col items-center justify-center bg-muted p-8 text-center space-y-4">
              <div className="p-4 rounded-full bg-black/5 text-foreground">
                <svg xmlns="http://www.w3.org/2001/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
              </div>
              <p className="text-sm font-medium text-muted-foreground max-w-xs">
                Add video at <code className="bg-black/5 px-1 rounded">public/videos/cto-bhaiya-youtube-scroll.mp4</code>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Strong Fade Overlays (Agentforce style blending into background) */}
      <div className="absolute inset-0 pointer-events-none rounded-[20px] lg:rounded-[28px] overflow-hidden z-30">
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-white/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 lg:h-60 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  );
}
