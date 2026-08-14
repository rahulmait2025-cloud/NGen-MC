"use client";

import type { ReactNode } from 'react';
import React, { useSyncExternalStore } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

import { useTheme } from "next-themes";

// Using standard next-themes hook instead of custom AUTH_THEME_KEY

function AuthBackground({ isDark }: { isDark: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={cn("absolute inset-0", isDark ? "bg-gradient-to-b from-[#030303] via-[#080808] to-[#0a0a0a]" : "bg-gradient-to-b from-[#fffbf7] via-[#fff8f2] to-[#ffedd5]")} />
      <div className={cn("auth-bg-drift-slow absolute -left-[22%] -top-[18%] h-[min(520px,58vh)] w-[min(540px,92vw)] rounded-[48%] blur-[118px]", isDark ? "bg-[#E8541A]/[0.2]" : "bg-[#fb923c]/[0.32]")} />
      <div className={cn("auth-bg-drift-slower absolute -right-[18%] top-[12%] h-[min(460px,52vh)] w-[min(480px,88vw)] rounded-[42%] blur-[125px]", isDark ? "bg-[#c2410c]/[0.14]" : "bg-[#fdba74]/[0.45]")} />
      <div className={cn("auth-bg-drift-mid absolute left-[5%] bottom-[-5%] h-[min(380px,42vh)] w-[min(400px,78vw)] rounded-[50%] blur-[95px]", isDark ? "bg-[#1c1917]/[0.65]" : "bg-[#ffedd5]/[0.7]")} />
      <div className={cn("auth-bg-drift-slower absolute right-[8%] top-[42%] h-[200px] w-[300px] rounded-full blur-[88px]", isDark ? "bg-amber-600/[0.09]" : "bg-orange-200/[0.5]")} />
      <div className={cn("auth-bg-drift-mid absolute left-[38%] top-[52%] h-[160px] w-[260px] -translate-x-1/2 rounded-full blur-[75px]", isDark ? "bg-[#E8541A]/[0.08]" : "bg-[#fed7aa]/[0.55]")} />
      <div className={cn("absolute inset-0 opacity-[0.3]", isDark ? "bg-[repeating-linear-gradient(125deg,transparent,transparent_3px,rgba(255,255,255,0.014)_3px,rgba(255,255,255,0.014)_4px)]" : "bg-[repeating-linear-gradient(125deg,transparent,transparent_3px,rgba(234,88,12,0.04)_3px,rgba(234,88,12,0.04)_4px)]")} />
      <svg className={cn("absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-40", isDark ? "text-[#E8541A]/[0.06]" : "text-orange-400/[0.08]")} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="auth-hex-mesh-signup" width="8" height="13.86" patternUnits="userSpaceOnUse" patternTransform="scale(0.45)">
            <path d="M4 0 L8 2.31 L8 6.93 L4 9.24 L0 6.93 L0 2.31 Z" fill="none" stroke="currentColor" strokeWidth="0.1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-hex-mesh-signup)" />
      </svg>
      <div className={cn("absolute inset-0", isDark ? "bg-[radial-gradient(ellipse_90%_80%_at_50%_45%,transparent_0%,rgba(0,0,0,0.62)_100%)]" : "bg-[radial-gradient(ellipse_92%_82%_at_50%_38%,transparent_20%,rgba(255,251,247,0.75)_100%)]")} />
    </div>
  );
}

export default function SignupPage(): ReactNode {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = !mounted || (resolvedTheme || theme) === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className={cn("relative min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-300", isDark ? "bg-[#030303]" : "bg-[#fffbf7]")}>
      <AuthBackground isDark={isDark} />

      {/* Theme Toggle */}
      <button type="button"
        onClick={toggleTheme}
          className={cn("absolute top-8 right-8 z-50 flex size-10 items-center justify-center rounded-full border shadow-lg transition-[transform,background-color,border-color] duration-160 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-105 active:scale-95", isDark ? "border-white/10 bg-zinc-900 text-yellow-400" : "border-orange-200 bg-white text-zinc-700")}
      >
        {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>

      <div className="w-full max-w-[420px] px-6 relative z-10">
        <div className={cn("relative overflow-hidden rounded-3xl p-8 shadow-2xl transition-[background-color,border-color,box-shadow] duration-300", isDark ? "bg-[#0c0c0c]/80 border border-white/5 backdrop-blur-xl" : "bg-white/90 border border-slate-100 backdrop-blur-xl shadow-slate-200/50")}>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
