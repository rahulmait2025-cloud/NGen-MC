import TiltedVideoSurface from "./TiltedVideoSurface";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <Navbar />

      {/* ===== TEXT ZONE — clean white, z-30, fully readable ===== */}
      <div className="relative z-30 mx-auto max-w-7xl px-6 pt-28 lg:pt-36">
        <div className="max-w-3xl flex flex-col space-y-8">
          <h1 className="text-5xl md:text-6xl lg:text-[5.5rem] font-extrabold text-[#111] leading-[1.05] tracking-tight">
            Learn coding the way{" "}
            <br className="hidden sm:block" />
            real engineers think.
          </h1>

          <p className="text-lg md:text-xl text-[#555] max-w-2xl leading-relaxed">
            Master DSA patterns, AI-powered development, real projects, GitHub,
            LinkedIn and interview readiness — all inside one career-focused LMS.
          </p>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-2">
            <button
              className={cn(
                "w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-[#111] rounded-xl",
                "hover:bg-neutral-800 transition-all duration-300 shadow-lg shadow-black/10"
              )}
            >
              Start Learning
            </button>
            <button
              className={cn(
                "w-full sm:w-auto px-8 py-4 text-lg font-bold text-[#111] bg-white border border-black/10 rounded-xl",
                "transition-all duration-300 hover:bg-black/5"
              )}
            >
              Watch CTO Bhaiya
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-0 mt-8 h-[420px] overflow-hidden bg-white sm:h-[460px] lg:mt-4 lg:h-[540px] xl:h-[620px]">
        <TiltedVideoSurface />
      </div>
    </section>
  );
}
