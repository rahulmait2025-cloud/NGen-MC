"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useSyncExternalStore, useReducer, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl, getClientBaseUrl } from "@/lib/auth/app-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Eye,
  EyeOff,
  Sun,
  GraduationCap,
  BarChart3,
  Play,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FormFieldStagger } from "@/components/_animations/form-field-stagger";

const EMPTY_SEARCH_PARAMS: Record<string, string | string[] | undefined> = {};

const REMEMBER_KEY = "ca_remembered_email:v1";

function saveRememberedEmail(email: string) {
  try { localStorage.setItem(REMEMBER_KEY, email); } catch { }
}
function loadRememberedEmail(): string | null {
  try { return localStorage.getItem(REMEMBER_KEY) || null; } catch { return null; }
}
function clearRememberedEmail() {
  try { localStorage.removeItem(REMEMBER_KEY); } catch { }
}

function oauthRedirect() {
  const origin = getClientBaseUrl();
  return getAuthRedirectUrl("college_admin", origin);
}

// Using standard next-themes hook instead of custom AUTH_THEME_KEY

export type UnifiedAuthMode = "global" | "tenant";

interface AuthState {
  loading: boolean;
  error: string | null;
  showLoginPassword: boolean;
  loginEmail: string;
  loginPassword: string;
  rememberMe: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY' }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_PASSWORD'; payload: string }
  | { type: 'SET_REMEMBER_ME'; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'TOGGLE_PASSWORD_VISIBILITY':
      return { ...state, showLoginPassword: !state.showLoginPassword };
    case 'SET_EMAIL':
      return { ...state, loginEmail: action.payload };
    case 'SET_PASSWORD':
      return { ...state, loginPassword: action.payload };
    case 'SET_REMEMBER_ME':
      return { ...state, rememberMe: action.payload };
  }
}

function getTenantUrlErrorMessage(err: string | null): string | null {
  if (err === "forbidden" || err === "wrong_portal") {
    return "This account does not have student access for this institution. Use the Student Portal only with credentials created by your college admin.";
  }
  if (err === "tenant") {
    return "This institution is not found. Check the URL or contact your admin.";
  }
  if (err === "account_disabled") return "This account is disabled.";
  if (err === "no_student_profile") {
    return "Account exists but no student profile found. Contact your college admin.";
  }
  return null;
}

function HeroPanel({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn(
      "hidden lg:flex lg:w-[55%] flex-none relative overflow-hidden border-r",
      isDark ? "bg-[#0c0c0c] border-white/5" : "bg-gradient-to-br from-[#fdf6ee] via-[#fff9f2] to-[#fdf1e1] border-orange-100/50"
    )}>
      <div className="absolute left-[10%] top-[20%] z-0 h-[300px] w-[300px] rounded-full bg-orange-200/10 blur-[80px]" />
      <div className="absolute right-[10%] bottom-[20%] z-0 h-[300px] w-[300px] rounded-full bg-orange-200/10 blur-[80px]" />
      <svg className="absolute inset-0 z-0 h-full w-full opacity-[0.55]" viewBox="0 0 800 800" fill="none">
        <defs><linearGradient id="line-grad-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e0ac81" stopOpacity="0.9" /><stop offset="100%" stopColor="#ca8c64" stopOpacity="1" /></linearGradient></defs>
        <path d="M0 350 H224 V304" stroke="url(#line-grad-g)" strokeWidth="2.5" />
        <path d="M800 350 H576 V304" stroke="url(#line-grad-g)" strokeWidth="2.5" />
        <path d="M0 500 H176 V624" stroke="url(#line-grad-g)" strokeWidth="2.5" />
        <path d="M800 500 H704 V400" stroke="url(#line-grad-g)" strokeWidth="2.5" />
        <path d="M224 304 V450 H176" stroke="url(#line-grad-g)" strokeWidth="1.8" strokeDasharray="6 4" />
        <path d="M576 304 V400 H704" stroke="url(#line-grad-g)" strokeWidth="1.8" strokeDasharray="6 4" />
        <path d="M704 400 V560 H624" stroke="url(#line-grad-g)" strokeWidth="1.8" strokeDasharray="6 4" />
        <path d="M624 560 V624 H480" stroke="url(#line-grad-g)" strokeWidth="1.8" strokeDasharray="6 4" />
        <path d="M320 624 H480" stroke="url(#line-grad-g)" strokeWidth="1.8" strokeDasharray="6 4" />
        <path d="M176 624 H320" stroke="url(#line-grad-g)" strokeWidth="1.8" strokeDasharray="6 4" />
        <circle cx="224" cy="304" r="4" fill="#ca8c64" /><circle cx="176" cy="624" r="4" fill="#ca8c64" /><circle cx="576" cy="304" r="4" fill="#ca8c64" /><circle cx="704" cy="400" r="4" fill="#ca8c64" /><circle cx="624" cy="560" r="4" fill="#ca8c64" /><circle cx="320" cy="624" r="4" fill="#ca8c64" /><circle cx="480" cy="624" r="4" fill="#ca8c64" />
      </svg>
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-[38%] left-[28%] z-30 -translate-x-1/2 -translate-y-1/2"><div className={cn("flex size-14 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-transform [@media(hover:hover)_and_(pointer:fine)]:hover:scale-110", isDark ? "border-[#E8541A]/40 bg-[#1a1a1a]/80 shadow-[#E8541A]/20" : "border-white/50 bg-[#fff9f2]/60")}><GraduationCap className={cn("size-6", isDark ? "text-[#E8541A]" : "text-[#ca8c64]")} /></div></div>
        <div className="absolute top-[78%] left-[22%] -translate-x-1/2 -translate-y-1/2"><div className={cn("flex size-14 items-center justify-center rounded-full border shadow-lg backdrop-blur-md", isDark ? "border-[#E8541A]/40 bg-[#1a1a1a]/80 shadow-[#E8541A]/20" : "border-white/50 bg-[#fff9f2]/60")}><div className="relative"><User className={cn("size-6", isDark ? "text-[#E8541A]" : "text-[#ca8c64]")} /><Settings className={cn("absolute -bottom-1 -right-1 size-3 animate-spin-slow", isDark ? "text-orange-400" : "text-orange-800")} /></div></div></div>
        <div className="absolute top-[38%] left-[72%] z-30 -translate-x-1/2 -translate-y-1/2"><div className={cn("flex size-14 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-transform [@media(hover:hover)_and_(pointer:fine)]:hover:scale-110", isDark ? "border-[#E8541A]/40 bg-[#1a1a1a]/80 shadow-[#E8541A]/20" : "border-white/50 bg-[#fff9f2]/60")}><BarChart3 className={cn("size-6", isDark ? "text-[#E8541A]" : "text-[#ca8c64]")} /></div></div>
        <div className="absolute top-[50%] left-[88%] -translate-x-1/2 -translate-y-1/2"><div className={cn("flex size-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md", isDark ? "border-[#E8541A]/40 bg-[#1a1a1a]/80 shadow-[#E8541A]/20" : "border-white/50 bg-[#fff9f2]/60")}><Play className={cn("size-5 ml-0.5", isDark ? "text-[#E8541A] fill-[#E8541A]/20" : "text-[#ca8c64] fill-[#ca8c64]/20")} /></div></div>
        <div className="absolute top-[70%] left-[78%] -translate-x-1/2 -translate-y-1/2"><div className={cn("flex size-14 items-center justify-center rounded-full border shadow-lg backdrop-blur-md", isDark ? "border-[#E8541A]/40 bg-[#1a1a1a]/80 shadow-[#E8541A]/20" : "border-white/50 bg-[#fff9f2]/60")}><BookOpen className={cn("size-6", isDark ? "text-[#E8541A]" : "text-[#ca8c64]")} /></div></div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[65%] flex items-end justify-center z-20"><Image src='/assets/founder.png' alt="Founder" fill sizes="(max-width: 1024px) 0vw, 55vw" className="object-contain object-bottom origin-bottom transition-[border-color,box-shadow,background-color] duration-300" priority /></div>
      <div className="absolute top-4 left-6 z-30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
        <Image src='/assets/logo-icon.png' alt="NextGen Logo" width={42} height={42} className="drop-shadow-md transition-transform [@media(hover:hover)_and_(pointer:fine)]:hover:scale-110 duration-200" />
        <h2 className={cn("text-base font-semibold tracking-tight", isDark ? "text-white" : "text-black")}>NextGen <span className={cn("font-black", isDark ? "text-[#E8541A]" : "text-black")}>CTO</span></h2>
      </div>
      <div className="absolute top-[10%] left-0 right-0 z-30 flex flex-col items-center text-center px-12">
        <div className="space-y-4">
          <h3 className="text-[2.2rem] xl:text-[2.8rem] font-black leading-none tracking-tight uppercase"><span className="text-[#E8541A] drop-shadow-sm">LEARN FROM LEADERS.</span></h3>
          <div className="flex items-center justify-center gap-10">
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#ca8c64]/40 to-transparent" />
            <h3 className={cn("text-[2rem] xl:text-[2.4rem] font-black leading-none tracking-tight uppercase", isDark ? "text-white/80" : "text-black/80")}>SHAPE THE FUTURE.</h3>
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#ca8c64]/40 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthFormCard({
  headingText,
  mutedText,
  isDark,
  message,
  displayError,
  emailRef,
  passwordRef,
  showLoginPassword,
  rememberMe,
  pendingAuth,
  forgotHref,
  onTogglePassword,
  onToggleRememberMe,
  onSubmit,
  onGoogleContinue,
}: {
  headingText: string;
  mutedText: string;
  isDark: boolean;
  message: string | null;
  displayError: string | null;
  emailRef: React.RefObject<HTMLInputElement | null>;
  passwordRef: React.RefObject<HTMLInputElement | null>;
  showLoginPassword: boolean;
  rememberMe: boolean;
  pendingAuth: boolean;
  forgotHref: string;
  onTogglePassword: () => void;
  onToggleRememberMe: (checked: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onGoogleContinue: () => void;
}) {
  const iconMuted = isDark ? "text-orange-200/50" : "text-orange-900/45";

  return (
    <div className="w-full max-w-[380px] relative z-20 animate-in fade-in slide-in-from-bottom-8 duration-300">
      <Card className={cn("relative overflow-hidden rounded-3xl border p-8 shadow-xl transition-[border-color,box-shadow,background-color] duration-300 gap-6", isDark ? "bg-[#0c0c0c] border-white/5 shadow-black/40" : "bg-white border-slate-100 shadow-slate-200/50")}>
        <CardHeader className="space-y-1 text-center p-0">
          <CardTitle className={cn("text-2xl font-semibold tracking-tight", headingText)}>Welcome Future CTO</CardTitle>
          <CardDescription className={cn("text-[13px] font-medium opacity-60", mutedText)}>Sign in to continue your leadership journey</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <FormFieldStagger className="space-y-4">
<div data-field className="space-y-2">
                  {message && !displayError && (
                    <Alert className="border-[#E8541A]/20 bg-[#E8541A]/0.05 p-2">
                      <AlertTitle className="text-[10px] font-semibold text-[#c2410c] dark:text-[#ffb38a]">{message}</AlertTitle>
                    </Alert>
                  )}
                  {displayError && (
                    <Alert variant="destructive" className="p-2">
                      <AlertTitle className="text-[10px] font-semibold">{displayError}</AlertTitle>
                    </Alert>
                  )}
                </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-3">
                <div data-field className="space-y-1.5 text-left">
                  <label htmlFor="login-email" className={cn("text-xs font-semibold px-0.5", headingText)}>Email</label>
                  <Input id="login-email" type="email" ref={emailRef} required placeholder="xyz@gmail.com" className={cn("h-11 rounded-lg border px-3 transition-[border-color,box-shadow,background-color] placeholder:text-zinc-400 focus-visible:ring-1", isDark ? "border-white/10 bg-white/5 text-white" : "border-orange-100 bg-[#fcf8f1] text-zinc-900")} autoComplete="email" />
                </div>
                <div data-field className="space-y-1.5 text-left">
                  <label htmlFor="login-password" className={cn("text-xs font-semibold px-0.5", headingText)}>Password</label>
                  <div className="relative group">
                    <Input id="login-password" type={showLoginPassword ? "text" : "password"} ref={passwordRef} required placeholder="Password" className={cn("h-11 rounded-lg border px-3 transition-[border-color,box-shadow,background-color] placeholder:text-zinc-400 focus-visible:ring-1", isDark ? "border-white/10 bg-white/5 text-white" : "border-orange-100 bg-[#fcf8f1] text-zinc-900")} autoComplete="current-password" />
                    <button type="button" className={cn("absolute right-3 top-1/2 -translate-y-1/2", iconMuted, "hover:text-[#E8541A] transition-colors")} onClick={onTogglePassword}>{showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                  </div>
                </div>
              </div>
              <div data-field className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={onToggleRememberMe}
                    className={isDark ? "border-white/20 bg-white/5 data-[state=checked]:bg-[#E8541A] data-[state=checked]:border-[#E8541A]" : "border-orange-300 bg-white data-[state=checked]:bg-[#E8541A] data-[state=checked]:border-[#E8541A]"}
                  />
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>Remember me</span>
                </label>
                <Link href={forgotHref} className="text-xs font-medium text-orange-800/80 hover:text-[#E8541A] transition-[border-color,box-shadow,background-color]">Forgot password?</Link>
              </div>
              <div data-field>
                <Button type="submit" disabled={pendingAuth} className="h-11 w-full rounded-xl bg-[#c2541a] hover:bg-[#a84414] text-sm font-bold text-white shadow-md transition-[border-color,box-shadow,background-color] active:scale-[0.98] disabled:opacity-50">{pendingAuth ? "Authenticating..." : "Sign In"}</Button>
              </div>
            </form>
            <div data-field className="relative w-full">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
              <div className="relative flex justify-center text-[10px] font-medium uppercase text-zinc-400"><span className="px-3 bg-card">OR</span></div>
            </div>
          </FormFieldStagger>
        </CardContent>
        <CardFooter className="flex-col gap-4 p-0">
          <Button type="button" variant="outline" className={cn("h-11 w-full rounded-xl border font-medium transition-[border-color,box-shadow,background-color]", isDark ? "!border-white/[0.08] !bg-[rgba(255,255,255,0.03)] !text-white hover:!bg-[rgba(255,255,255,0.08)] hover:!border-white/[0.15]" : "border-slate-200 bg-white text-zinc-900 hover:bg-slate-50")} disabled={pendingAuth} onClick={onGoogleContinue}>
            <GoogleIcon className="mr-2 size-4" /><span className="text-sm">Sign in with Google</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/** OAuth callback / redirect query errors shared by global and tenant login. */
function getSharedAuthUrlErrorMessage(err: string | null): string | null {
  if (err === "network") {
    return "Could not reach the sign-in service (connection timed out). Check your internet, VPN, or firewall, then try Google sign-in again.";
  }
  if (err === "session") {
    return "Your sign-in session could not be completed. Please try again.";
  }
  return null;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06 0.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c0.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
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
            id="auth-hex-mesh"
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
        <rect width="100%" height="100%" fill="url(#auth-hex-mesh)" />
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

export function UnifiedAuthScreen({ mode, searchParams = EMPTY_SEARCH_PARAMS }: { mode: UnifiedAuthMode, searchParams?: Record<string, string | string[] | undefined> }) {
  const router = useRouter();
  const params = useParams();
  const getQuery = (k: string) => { const v = searchParams[k]; return Array.isArray(v) ? v[0] : v ?? null; };
  const message = getQuery("message");

  const collegeSlug =
    mode === "tenant" && typeof params?.collegeSlug === "string"
      ? params.collegeSlug
      : "";
  const qErr = getQuery("error");
  const sharedUrlError = getSharedAuthUrlErrorMessage(qErr);
  const tenantUrlError =
    mode === "tenant" ? getTenantUrlErrorMessage(qErr) : null;

  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [state, dispatch] = useReducer(authReducer, {
    loading: false,
    error: null,
    showLoginPassword: false,
    loginEmail: '',
    loginPassword: '',
    rememberMe: false,
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const remembered = loadRememberedEmail();
    if (remembered) {
      if (emailRef.current) {
        emailRef.current.value = remembered;
      }
      dispatch({ type: 'SET_REMEMBER_ME', payload: true });
    }
  }, []);

  const { loading, error: stateError, showLoginPassword, rememberMe } = state;



  // Supabase invite flow redirects to Site URL (/login) with hash tokens.
  // Establish session here, then navigate to /auth/set-password.
  const inviteHandledRef = useRef(false);
  useEffect(() => {
    if (inviteHandledRef.current) return;
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || (!hash.includes('type=invite') && !hash.includes('type=recovery'))) return;

    inviteHandledRef.current = true;
    const handleInviteRedirect = async () => {
      const supabase = createClient();
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        const { error: sessionErr } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!sessionErr) {
          // Clear hash so this doesn't re-trigger
          window.history.replaceState({}, '', window.location.pathname);
          window.location.replace('/auth/set-password');
          return;
        }
      }
    };
    handleInviteRedirect();
  }, [router]);

  const isDark = !mounted || (resolvedTheme || theme) === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const logFailedLogin = async (reason: string) => {
    if (mode !== "tenant" || !collegeSlug) return;
    const emailVal = emailRef.current?.value || "";
    await fetch("/api/student/auth-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "failed_login",
        slug: collegeSlug,
        email: emailVal.trim().toLowerCase(),
        reason,
      }),
    }).catch(() => undefined);
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_LOADING', payload: true });
    const emailVal = emailRef.current?.value || "";
    const passwordVal = passwordRef.current?.value || "";
    const email = emailVal.trim().toLowerCase();

    try {
      const loginResponse = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          password: passwordVal,
          ...(mode === "tenant" && collegeSlug ? { slug: collegeSlug } : {}),
        }),
      });

      const payload = (await loginResponse.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
      } | null;

      if (!loginResponse.ok) {
        if (mode === "tenant") {
          await logFailedLogin("invalid_credentials");
        }
        dispatch({ type: 'SET_ERROR', payload: 
          mode === "tenant"
            ? (payload?.error ?? "Invalid email or password.")
            : (payload?.error ?? "Invalid email or password.")
        });
        return;
      }

      if (rememberMe) {
        saveRememberedEmail(email);
      } else {
        clearRememberedEmail();
      }

      if (mode === "tenant") {
        const redirectTo =
          payload?.redirectTo ??
          `/c/${encodeURIComponent(collegeSlug)}/student/auth/callback`;
        window.location.href = redirectTo;
        return;
      }

      const redirectTo = payload?.redirectTo;
      if (!redirectTo) {
        dispatch({ type: 'SET_ERROR', payload: "Login failed: Session not established." });
        return;
      }

      window.location.href = redirectTo;
    } catch {
      dispatch({ type: 'SET_ERROR', payload: "Something went wrong. Try again." });
    }
  };

  const handleGoogleContinue = async () => {
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const supabase = createClient();
      const redirectTo = oauthRedirect();
      if (process.env.NODE_ENV !== "production") {
        console.info("[auth/oauth] redirectTo:", redirectTo);
      }
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) {
        dispatch({ type: 'SET_ERROR', payload: oauthError.message });
        return;
      }
    } catch {
      dispatch({ type: 'SET_ERROR', payload: "Something went wrong. Try again." });
    }
  };

  const displayError = stateError ?? sharedUrlError ?? tenantUrlError;
  const pendingAuth = loading && !displayError;

  const mutedText = isDark ? "text-zinc-400" : "text-zinc-600";
  const headingText = isDark ? "text-white" : "text-zinc-900";
  const bgPage = isDark ? "bg-[#030303]" : "bg-[#fffbf7]";

  const forgotHref =
    mode === "tenant" && collegeSlug
      ? `/c/${encodeURIComponent(collegeSlug)}/student/forgot-password`
      : "/forgot-password";

  /* --- GLOBAL MODE: original founder + circuit board layout --- */
  return (
    <div
      className={cn(
        "relative h-screen flex flex-col lg:flex-row overflow-hidden",
        bgPage,
        isDark ? "text-zinc-100" : "text-zinc-900",
      )}
    >
      <HeroPanel isDark={isDark} />

      {/* RIGHT PANEL: AUTH FORM */}
      <div className="flex-1 relative flex flex-col items-center justify-center -mt-8">
        <AuthBackground isDark={isDark} />
        <button type="button" onClick={toggleTheme} className={cn("absolute top-16 right-4 z-50 flex size-9 items-center justify-center rounded-full border shadow-md transition-[border-color,box-shadow,background-color] duration-300 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-110 cursor-pointer", isDark ? "border-white/20 bg-zinc-800 text-yellow-300 hover:bg-zinc-700" : "border-orange-200 bg-white text-zinc-700 hover:bg-orange-50")} aria-label="Toggle dark mode">
          {isDark ? <Sun className="size-4" /> : null}
        </button>
        <AuthFormCard
          headingText={headingText}
          mutedText={mutedText}
          isDark={isDark}
          message={message}
          displayError={displayError}
          emailRef={emailRef}
          passwordRef={passwordRef}
          showLoginPassword={showLoginPassword}
          rememberMe={rememberMe}
          pendingAuth={pendingAuth}
          forgotHref={forgotHref}
          onTogglePassword={() => dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' })}
          onToggleRememberMe={(checked) => dispatch({ type: 'SET_REMEMBER_ME', payload: checked })}
          onSubmit={handleLogin}
          onGoogleContinue={handleGoogleContinue}
        />
      </div>
    </div>
  );
}

