"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useSyncExternalStore, useReducer, Suspense, useRef } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Mail, Lock, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginYouTubeStats } from "@/components/auth/login-youtube-stats";
import { useTheme } from "next-themes";

const REMEMBER_KEY = "ca_college_admin_remembered_email:v1";

function saveRememberedEmail(email: string) {
  try { localStorage.setItem(REMEMBER_KEY, email); } catch { }
}
function loadRememberedEmail(): string | null {
  try { return localStorage.getItem(REMEMBER_KEY) || null; } catch { return null; }
}
function clearRememberedEmail() {
  try { localStorage.removeItem(REMEMBER_KEY); } catch { }
}


// Using standard next-themes hook instead of custom AUTH_THEME_KEY

export type CollegeAdminAuthMode = "global" | "tenant";

function getCollegeAdminUrlErrorMessage(err: string | null): string | null {
  if (err === "account_disabled") return "This account is disabled.";
  if (err === "no_college_access") {
    return "No college admin access for this account. Sign in with credentials issued by your institution.";
  }
  return null;
}

/** OAuth callback / redirect query errors shared with the student login pattern. */
function getSharedAuthUrlErrorMessage(err: string | null): string | null {
  if (err === "network") {
    return "Could not reach the sign-in service (connection timed out). Check your internet, VPN, or firewall, then try again.";
  }
  if (err === "session") {
    return "Your sign-in session could not be completed. Please try again.";
  }
  return null;
}

function AuthBackground({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0",
          isDark
            ? "bg-gradient-to-b from-[#030303] via-[#080808] to-[#0a0a0a]"
            : "bg-gradient-to-b from-[#fffbf7] via-[#fff8f2] to-[#ffedd5]",
        )}
      />
      <div
        className={cn(
          "auth-bg-drift-slow absolute -left-[22%] -top-[18%] h-[min(520px,58vh)] w-[min(540px,92vw)] rounded-[48%] blur-[118px]",
          isDark ? "bg-[#E8541A]/[0.2]" : "bg-[#fb923c]/[0.32]",
        )}
      />
      <div
        className={cn(
          "auth-bg-drift-slower absolute -right-[18%] top-[12%] h-[min(460px,52vh)] w-[min(480px,88vw)] rounded-[42%] blur-[125px]",
          isDark ? "bg-[#c2410c]/[0.14]" : "bg-[#fdba74]/[0.45]",
        )}
      />
      <div
        className={cn(
          "auth-bg-drift-mid absolute left-[5%] bottom-[-5%] h-[min(380px,42vh)] w-[min(400px,78vw)] rounded-[50%] blur-[95px]",
          isDark ? "bg-[#1c1917]/[0.65]" : "bg-[#ffedd5]/[0.7]",
        )}
      />
      <div
        className={cn(
          "auth-bg-drift-slower absolute right-[8%] top-[42%] h-[200px] w-[300px] rounded-full blur-[88px]",
          isDark ? "bg-amber-600/[0.09]" : "bg-orange-200/[0.5]",
        )}
      />
      <div
        className={cn(
          "auth-bg-drift-mid absolute left-[38%] top-[52%] h-[160px] w-[260px] -translate-x-1/2 rounded-full blur-[75px]",
          isDark ? "bg-[#E8541A]/[0.08]" : "bg-[#fed7aa]/[0.55]",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 opacity-[0.3]",
          isDark
            ? "bg-[repeating-linear-gradient(125deg,transparent,transparent_3px,rgba(255,255,255,0.014)_3px,rgba(255,255,255,0.014)_4px)]"
            : "bg-[repeating-linear-gradient(125deg,transparent,transparent_3px,rgba(234,88,12,0.04)_3px,rgba(234,88,12,0.04)_4px)]",
        )}
      />
      <svg
        className={cn(
          "absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-40",
          isDark ? "text-[#E8541A]/[0.06]" : "text-orange-400/[0.08]",
        )}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="auth-hex-mesh-admin"
            width="8"
            height="13.86"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(0.45)"
          >
            <path
              d="M4 0 L8 2.31 L8 6.93 L4 9.24 L0 6.93 L0 2.31 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-hex-mesh-admin)" />
      </svg>
      <div
        className={cn(
          "absolute inset-0",
          isDark
            ? "bg-[radial-gradient(ellipse_90%_80%_at_50%_45%,transparent_0%,rgba(0,0,0,0.62)_100%)]"
            : "bg-[radial-gradient(ellipse_92%_82%_at_50%_38%,transparent_20%,rgba(255,251,247,0.75)_100%)]",
        )}
      />
    </div>
  );
}

type AuthFormState = {
  loading: boolean;
  error: string | null;
  showLoginPassword: boolean;
  loginEmail: string;
  loginPassword: string;
  rememberMe: boolean;
};

type AuthFormAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'TOGGLE_PASSWORD' }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_PASSWORD'; payload: string }
  | { type: 'SET_REMEMBER_ME'; payload: boolean }
  | { type: 'RESET_ERROR' };

function authFormReducer(state: AuthFormState, action: AuthFormAction): AuthFormState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'TOGGLE_PASSWORD':
      return { ...state, showLoginPassword: !state.showLoginPassword };
    case 'SET_EMAIL':
      return { ...state, loginEmail: action.payload };
    case 'SET_PASSWORD':
      return { ...state, loginPassword: action.payload };
    case 'SET_REMEMBER_ME':
      return { ...state, rememberMe: action.payload };
    case 'RESET_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

function CollegeAdminAuthScreenContent({
  mode,
  collegeSlug: collegeSlugFromPage,
}: {
  mode: CollegeAdminAuthMode;
  collegeSlug?: string;
}) {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const message = searchParams.get("message");

  const collegeSlug =
    mode === "tenant"
      ? collegeSlugFromPage ??
        (typeof params?.collegeSlug === "string" ? params.collegeSlug : "")
      : "";
  const qErr = searchParams.get("error");
  const sharedUrlError = getSharedAuthUrlErrorMessage(qErr);
  const adminUrlError = getCollegeAdminUrlErrorMessage(qErr);
  const fromUrlGeneric =
    qErr && !sharedUrlError && !adminUrlError
      ? "Sign-in failed. Please try again."
      : null;

  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [form, dispatch] = useReducer(authFormReducer, {
    loading: false,
    error: null,
    showLoginPassword: false,
    loginEmail: "",
    loginPassword: "",
    rememberMe: false,
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Load saved email on mount (session managed by httpOnly cookie, no password stored)
  React.useEffect(() => {
    const savedEmail = loadRememberedEmail();
    if (savedEmail) {
      if (emailRef.current) {
        emailRef.current.value = savedEmail;
      }
      dispatch({ type: 'SET_REMEMBER_ME', payload: true });
    }
  }, []);

  const isDark = !mounted || (resolvedTheme || theme) === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch({ type: 'RESET_ERROR' });
    const emailVal = emailRef.current?.value || "";
    const passwordVal = passwordRef.current?.value || "";
    const trimmedEmail = emailVal.trim().toLowerCase();
    if (!trimmedEmail || !passwordVal) {
      dispatch({ type: 'SET_ERROR', payload: "Please enter email and password." });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: trimmedEmail,
          password: passwordVal,
          ...(mode === "tenant" && collegeSlug ? { slug: collegeSlug } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
      } | null;

      if (!response.ok) {
        dispatch({ type: 'SET_ERROR', payload: payload?.error ?? "Invalid email or password." });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      if (form.rememberMe) {
        saveRememberedEmail(trimmedEmail);
      } else {
        clearRememberedEmail();
      }

      const redirectTo = payload?.redirectTo;
      if (!redirectTo) {
        dispatch({ type: 'SET_ERROR', payload: "Login failed: Session not established." });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      router.push(redirectTo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isNetworkError =
        msg === "Failed to fetch" ||
        msg.includes("NetworkError") ||
        msg.includes("Load failed");
      dispatch({
        type: 'SET_ERROR',
        payload: isNetworkError
          ? "Unable to reach the server. Check your network, restart the dev server, and try again."
          : "Invalid email or password.",
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const displayError =
    form.error ?? sharedUrlError ?? adminUrlError ?? fromUrlGeneric;

  const inputClass = isDark
    ? "h-12 rounded-xl border border-[#E8541A]/25 bg-[#E8541A]/[0.07] text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,140,60,0.08)] backdrop-blur-xl placeholder:text-zinc-500 focus-visible:border-[#E8541A] focus-visible:ring-2 focus-visible:ring-[#E8541A]/25"
    : "h-12 rounded-xl border border-orange-200/70 bg-orange-50/35 text-zinc-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] backdrop-blur-xl placeholder:text-zinc-500 focus-visible:border-[#E8541A] focus-visible:ring-2 focus-visible:ring-[#E8541A]/25";

  const iconMuted = isDark ? "text-orange-200/50" : "text-orange-900/45";
  const mutedText = isDark ? "text-zinc-400" : "text-zinc-600";
  const headingText = isDark ? "text-white" : "text-zinc-900";
  const bgPage = isDark ? "bg-[#030303]" : "bg-[#fffbf7]";
  const forgotHref =
    mode === "tenant" && collegeSlug
      ? `/c/${encodeURIComponent(collegeSlug)}/admin/forgot-password`
      : "/forgot-password";

  return (
    <div
      className={cn(
        "relative min-h-screen",
        bgPage,
        isDark ? "text-zinc-100" : "text-zinc-900",
      )}
    >
      <AuthBackground isDark={isDark} />

      <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

      <div className="relative z-[1] flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[420px]">

          <AuthHeader
            mode={mode}
            isDark={isDark}
            headingText={headingText}
            mutedText={mutedText}
          />

          <LoginYouTubeStats isDark={isDark} />

          <AuthMessages message={message} displayError={displayError} />

          <AuthForm
            emailRef={emailRef}
            passwordRef={passwordRef}
            showLoginPassword={form.showLoginPassword}
            setShowLoginPassword={(_fn: ((prev: boolean) => boolean) | boolean) => {
              dispatch({ type: 'TOGGLE_PASSWORD' });
            }}
            rememberMe={form.rememberMe}
            setRememberMe={(v: boolean) => dispatch({ type: 'SET_REMEMBER_ME', payload: v })}
            loading={form.loading}
            isDark={isDark}
            inputClass={inputClass}
            iconMuted={iconMuted}
            mutedText={mutedText}
            forgotHref={forgotHref}
            mode={mode}
            onSubmit={handleLogin}
          />
        </div>

        <div className="pointer-events-none fixed bottom-5 left-5 z-[1] opacity-40 sm:bottom-6 sm:left-6">
          <div
            className={cn(
              "size-8 overflow-hidden rounded-full backdrop-blur-sm",
              isDark ? "ring-1 ring-[#E8541A]/25" : "ring-1 ring-orange-200/80",
            )}
          >
            <Image
              src='/assets/logo-icon.png'
              alt=""
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollegeAdminAuthScreen({
  mode,
  collegeSlug,
}: {
  mode: CollegeAdminAuthMode;
  collegeSlug?: string;
}) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#030303]">
        <div className="size-8 animate-spin rounded-full border-2 border-[#E8541A] border-t-transparent" />
      </div>
    }>
      <CollegeAdminAuthScreenContent mode={mode} collegeSlug={collegeSlug} />
    </Suspense>
  );
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex size-11 items-center justify-center rounded-full border backdrop-blur-xl transition-colors",
          isDark
            ? "border-[#E8541A]/35 bg-[#E8541A]/[0.1] text-orange-100 hover:bg-[#E8541A]/[0.16]"
            : "border-orange-200/90 bg-orange-50/60 text-orange-950 shadow-sm hover:bg-orange-50/90",
        )}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </button>
    </div>
  );
}

function AuthHeader({ mode, isDark, headingText, mutedText }: { mode: CollegeAdminAuthMode; isDark: boolean; headingText: string; mutedText: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      {mode === "tenant" && (
        <p className="mb-3 rounded-full border border-[#E8541A]/25 bg-[#E8541A]/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#E8541A] backdrop-blur-sm">
          Admin portal
        </p>
      )}
      <div className="relative mb-6">
        <div
          className={cn(
            "absolute inset-0 -m-6 rounded-full blur-2xl",
            isDark ? "bg-[#E8541A]/15" : "bg-orange-400/15",
          )}
          aria-hidden
        />
        <div className="relative flex items-center justify-center gap-3">
          <div
            className={cn(
              "relative size-12 shrink-0 overflow-hidden rounded-2xl shadow-lg",
              isDark
                ? "ring-2 ring-[#E8541A]/30 shadow-black/30"
                : "ring-2 ring-orange-200/90 shadow-orange-200/40",
            )}
          >
            <Image
              src='/assets/logo-icon.png'
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <span className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className={headingText}>NextGen </span>
            <span className="text-[#E8541A] font-extrabold">CTO</span>
          </span>
        </div>
      </div>
      <h1
        className={cn(
          "max-w-sm text-balance text-3xl font-bold leading-[1.15] tracking-tight sm:text-[1.85rem]",
          headingText,
        )}
      >
        Welcome back
      </h1>
      <p
        className={cn(
          "mt-6 text-[15px] font-normal leading-relaxed sm:text-base",
          mutedText,
        )}
      >
        {mode === "tenant"
          ? "Sign in with your admin credentials for this institution."
          : "Sign in to manage programs, students, and placements."}
      </p>
    </div>
  );
}

function AuthMessages({ message, displayError }: { message: string | null; displayError: string | null }) {
  return (
    <>
      {message && !displayError && (
        <Alert className="mb-4 border-[#E8541A]/30 bg-[#E8541A]/10">
          <AlertTitle className="text-[#c2410c] dark:text-[#ffb38a]">{message}</AlertTitle>
        </Alert>
      )}

      {displayError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{displayError}</AlertTitle>
        </Alert>
      )}
    </>
  );
}

function AuthForm({
  emailRef, passwordRef,
  showLoginPassword, setShowLoginPassword, rememberMe, setRememberMe,
  loading, isDark,
  inputClass, iconMuted, mutedText, forgotHref, mode, onSubmit,
}: {
  emailRef: React.RefObject<HTMLInputElement | null>;
  passwordRef: React.RefObject<HTMLInputElement | null>;
  showLoginPassword: boolean; setShowLoginPassword: (v: ((prev: boolean) => boolean) | boolean) => void;
  rememberMe: boolean; setRememberMe: (v: boolean) => void;
  loading: boolean; isDark: boolean;
  inputClass: string; iconMuted: string; mutedText: string;
  forgotHref: string; mode: CollegeAdminAuthMode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="sr-only">Email</label>
        <div className="relative">
          <Mail className={cn("pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2", iconMuted)} />
          <Input
            id="login-email" type="email" ref={emailRef}
            required placeholder={mode === "tenant" ? "you@college.edu" : "admin@college.edu"}
            className={cn(inputClass, "pl-10")} autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="sr-only">Password</label>
        <div className="relative">
          <Lock className={cn("pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2", iconMuted)} />
          <Input
            id="login-password" type={showLoginPassword ? "text" : "password"}
            ref={passwordRef}
            required placeholder="Password"
            className={cn(inputClass, "pl-10 pr-10")} autoComplete="current-password"
          />
          <button
            type="button"
            className={cn("absolute right-3 top-1/2 -translate-y-1/2", iconMuted, isDark ? "hover:text-orange-200/90" : "hover:text-orange-800")}
            onClick={() => setShowLoginPassword((v) => !v)}
            aria-label={showLoginPassword ? "Hide password" : "Show password"}
          >
            {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
<div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              className={isDark ? "border-white/20 bg-white/5 data-[state=checked]:bg-[#E8541A] data-[state=checked]:border-[#E8541A]" : "border-orange-300 bg-white data-[state=checked]:bg-[#E8541A] data-[state=checked]:border-[#E8541A]"}
            />
            <span className={cn("text-xs font-medium", mutedText)}>Remember me</span>
          </label>
          <Link href={forgotHref} className={cn("text-xs font-medium hover:text-[#E8541A]", mutedText)}>
            Forgot password?
          </Link>
        </div>
      <Button
        type="submit" disabled={loading}
        className="h-12 w-full rounded-xl bg-gradient-to-r from-[#E8541A] via-[#ea580c] to-[#7c2d12] text-[15px] font-semibold text-white shadow-lg shadow-orange-900/25 transition-[background-color,transform] duration-160 hover:brightness-[1.05] active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Please wait..." : "Continue"}
      </Button>
    </form>
  );
}
