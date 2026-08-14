"use client";

import { cn } from "@/lib/utils";

/** Single trust line on the login screen (no live API). */
export function LoginYouTubeStats({ isDark }: { isDark: boolean }) {
  return (
    <p
      className={cn(
        "mb-10 text-center text-[15px] font-medium leading-relaxed tracking-wide sm:text-base",
        isDark ? "text-zinc-400" : "text-orange-950/70",
      )}
    >
      Trusted by{" "}
      <span className="font-semibold tabular-nums text-[#E8541A]">60k+</span>{" "}
      learners.
    </p>
  );
}
