'use client';

import Link from 'next/link';
import React, { useReducer, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectUrl, getClientBaseUrl } from '@/lib/auth/app-url';
import { getStudentOAuthCallbackUrl, studentPortalBasePath } from '@/lib/auth/student-auth-urls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { Eye, EyeOff, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { FormFieldStagger } from '@/components/_animations/form-field-stagger';
import { passwordLogin, recordStudentAuthEvent } from '@/lib/api/student-client';
import { FloatingPaths } from '@/components/ui/floating-paths';
import { AuthDivider } from '@/components/ui/auth-divider';
import { AuthHeroPanel } from '@/components/auth/auth-hero-panel';
import { AuthBackground } from '@/components/auth/auth-background';

const EMPTY_SEARCH_PARAMS: Record<string, string | string[] | undefined> = {};
const REMEMBER_KEY = 'lms_v1:remembered_email';

function saveRememberedEmail(email: string) {
  try {
    localStorage.setItem(REMEMBER_KEY, email);
  } catch { /* ignore */ }
}

function loadRememberedEmail(): string | null {
  try {
    const value = localStorage.getItem(REMEMBER_KEY);
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch { return null; }
}

function clearRememberedEmail() {
  try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
}

export type UnifiedAuthMode = 'global' | 'tenant';

function getTenantUrlErrorMessage(err: string | null): string | null {
  if (err === 'forbidden' || err === 'wrong_portal') {
    return 'This account does not have student access for this institution. Use the Student Portal only with credentials created by your college admin.';
  }
  if (err === 'tenant') {
    return 'This institution is not found. Check the URL or contact your admin.';
  }
  if (err === 'account_disabled') return 'This account is disabled.';
  if (err === 'no_student_profile') {
    return 'Account exists but no student profile found. Contact your college admin.';
  }
  return null;
}

function getSharedAuthUrlErrorMessage(err: string | null): string | null {
  if (err === 'network') {
    return 'Could not reach the sign-in service (connection timed out). Check your internet, VPN, or firewall, then try Google sign-in again.';
  }
  if (err === 'session') {
    return 'Your sign-in session could not be completed. Please try again.';
  }
  if (err === 'oauth_pkce') {
    return 'Your Google sign-in session expired. Please try again from this browser.';
  }
  if (err === 'oauth_failed') {
    return 'Google sign-in failed. Please try again.';
  }
  if (err === 'session_revoked') {
    return 'Your session was ended because you logged in on another device. If this was not you, please change your password.';
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

export function UnifiedAuthScreen({
  mode,
  searchParams = EMPTY_SEARCH_PARAMS,
}: {
  mode: UnifiedAuthMode;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const params = useParams();
  const { resolvedTheme } = useTheme();
  const themeMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isRightDark = themeMounted ? (resolvedTheme ?? 'dark') === 'dark' : true;
  const getQuery = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v ?? null;
  };
  const message = getQuery('message');

  const collegeSlug =
    mode === 'tenant' && typeof params?.collegeSlug === 'string'
      ? params.collegeSlug
      : '';
  const qErr = getQuery('error');
  const resetSuccess = getQuery('reset') === 'success';
  const sharedUrlError = getSharedAuthUrlErrorMessage(qErr);
  const tenantUrlError = mode === 'tenant' ? getTenantUrlErrorMessage(qErr) : null;

  interface AuthState {
    loading: boolean;
    error: string | null;
    showLoginPassword: boolean;
    rememberMe: boolean;
  }

  type AuthAction =
    | { type: 'setLoading'; value: boolean }
    | { type: 'setError'; value: string | null }
    | { type: 'setShowLoginPassword'; value: boolean | ((prev: boolean) => boolean) }
    | { type: 'setRememberMe'; value: boolean };

  function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
      case 'setLoading':
        return { ...state, loading: action.value };
      case 'setError':
        return { ...state, error: action.value };
      case 'setShowLoginPassword':
        return {
          ...state,
          showLoginPassword:
            typeof action.value === 'function'
              ? action.value(state.showLoginPassword)
              : action.value,
        };
      case 'setRememberMe':
        return { ...state, rememberMe: action.value };
    }
  }

  const [authState, dispatch] = useReducer(authReducer, {
    loading: false,
    error: null,
    showLoginPassword: false,
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
      dispatch({ type: 'setRememberMe', value: true });
    }
  }, []);

  const { loading, error, showLoginPassword, rememberMe } = authState;

  const setLoading = useCallback((value: boolean) => dispatch({ type: 'setLoading', value }), []);
  const setError = useCallback((value: string | null) => dispatch({ type: 'setError', value }), []);
  const setShowLoginPassword = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => dispatch({ type: 'setShowLoginPassword', value }),
    [],
  );
  const setRememberMe = useCallback((value: boolean) => dispatch({ type: 'setRememberMe', value }), []);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || (!hash.includes('type=invite') && !hash.includes('type=recovery'))) return;

    const handleAuthHashRedirect = async () => {
      const supabase = createClient();
      const p = new URLSearchParams(hash.slice(1));
      const linkType = p.get('type');
      const access_token = p.get('access_token');
      const refresh_token = p.get('refresh_token');
      if (!access_token || !refresh_token) return;

      const { error: sessionErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionErr) return;

      window.history.replaceState({}, '', window.location.pathname);

      if (linkType === 'recovery') {
        const resetPath =
          mode === 'tenant' && collegeSlug
            ? `${studentPortalBasePath(collegeSlug)}/reset-password`
            : '/reset-password';
        window.location.replace(resetPath);
        return;
      }

      if (linkType === 'invite') {
        window.location.replace('/auth/set-password');
      }
    };
    void handleAuthHashRedirect();
  }, [router, mode, collegeSlug]);

  const logFailedLogin = useCallback(
    async (reason: string, email: string) => {
      if (mode !== 'tenant' || !collegeSlug) return;
      await recordStudentAuthEvent({
        event: 'failed_login',
        slug: collegeSlug,
        email: email.trim().toLowerCase(),
        reason,
      }).catch(() => undefined);
    },
    [mode, collegeSlug],
  );

  const oauthNext = getQuery('next');

  const handleLogin = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submittingRef.current || loading) return;

      const emailVal = emailRef.current?.value || '';
      const passwordVal = passwordRef.current?.value || '';

      submittingRef.current = true;
      setError(null);
      setLoading(true);
      const email = emailVal.trim().toLowerCase();
      const loginAttemptId = crypto.randomUUID();

      try {
        const { ok, payload } = await passwordLogin<{
          error?: string;
          redirectTo?: string;
        }>(
          {
            email,
            password: passwordVal,
            ...(mode === 'tenant' && collegeSlug ? { slug: collegeSlug } : {}),
            next: oauthNext || '',
          },
          loginAttemptId,
        );

        if (!ok) {
          if (mode === 'tenant') {
            await logFailedLogin('invalid_credentials', email);
          }
          setError(payload?.error ?? 'Invalid email or password.');
          return;
        }

        if (rememberMe) {
          saveRememberedEmail(email);
        } else {
          clearRememberedEmail();
        }

        const redirectTo = payload?.redirectTo;
        if (!redirectTo) {
          setError('Login succeeded but no redirect was found. Contact your admin.');
          return;
        }

        window.location.replace(redirectTo);
      } catch {
        setError("Couldn't connect. Check your internet and try again.");
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [rememberMe, mode, collegeSlug, logFailedLogin, setError, setLoading, loading, oauthNext],
  );

  const oauthRedirect = useCallback(() => {
    const origin = getClientBaseUrl();
    return getAuthRedirectUrl('student', origin);
  }, []);

  const handleGoogleContinue = useCallback(async () => {
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo =
        mode === 'tenant' && collegeSlug
          ? getStudentOAuthCallbackUrl(collegeSlug, origin, oauthNext)
          : oauthRedirect();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) {
        setError(oauthError.message);
        submittingRef.current = false;
        setLoading(false);
      }
    } catch {
      setError("Couldn't connect. Check your internet and try again.");
      submittingRef.current = false;
      setLoading(false);
    }
  }, [mode, collegeSlug, oauthRedirect, oauthNext, setError, setLoading, loading]);

  const displayError = error ?? sharedUrlError ?? tenantUrlError;
  const pendingAuth = loading && !displayError;

  const forgotHref =
    mode === 'tenant' && collegeSlug
      ? `/c/${encodeURIComponent(collegeSlug)}/student/forgot-password`
      : '/forgot-password';

  return (
    <main className="login-page relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground transition-colors duration-300 lg:flex-row">
      {/* Full-page vector motion paths across both left & right columns */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <AuthBackground isDark={isRightDark} />
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* LEFT PANEL */}
      <AuthHeroPanel />

      {/* RIGHT PANEL */}
      <section className="login-form-panel relative z-10 flex min-w-0 flex-1 flex-col justify-center overflow-visible px-8 py-6 sm:px-12 lg:py-8">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <ThemeToggle className="relative size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60" />
        </div>

        <div className="mx-auto w-full max-w-md bg-card/70 backdrop-blur-2xl border border-border/50 p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="flex flex-col space-y-1.5 text-left">
            <h1 className="font-bold text-2xl sm:text-3xl tracking-tight text-foreground">
              Sign In or Join Now!
            </h1>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              Login or create your NextGen CTO account to start your engineering track.
            </p>
          </div>

          <FormFieldStagger className="space-y-4">
            <div data-field className="space-y-2">
              {resetSuccess && !displayError && (
                <Alert className="border-success/20 bg-success/5 text-success dark:text-success animate-in zoom-in-95">
                  <CheckCircle2 className="size-4" />
                  <AlertDescription className="text-center text-xs font-semibold">
                    Your password has been updated. Please sign in with your new password.
                  </AlertDescription>
                </Alert>
              )}
              {message && !displayError && !resetSuccess && (
                <Alert className="border-primary/20 bg-primary/5 text-primary dark:text-primary animate-in zoom-in-95">
                  <AlertDescription className="text-center text-xs font-semibold">
                    {message}
                  </AlertDescription>
                </Alert>
              )}
              {displayError && (
                qErr === 'session_revoked' ? (
                  <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-amber-600/[0.04] to-transparent p-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="absolute -right-4 -top-4 size-24 rounded-full bg-amber-500/[0.06] blur-2xl" aria-hidden />
                    <div className="relative flex gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/20">
                        <ShieldAlert className="size-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-amber-200/90 leading-snug">Signed out — new login detected</p>
                        <p className="mt-1.5 text-[12px] text-amber-200/60 leading-relaxed">
                          Your session was ended because your account was accessed from another device or browser.
                        </p>
                        <p className="mt-2 text-[11px] font-medium text-amber-300/70">
                          If this wasn&apos;t you, please change your password immediately to secure your account.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-3.5 text-left text-xs font-semibold leading-relaxed border border-destructive/20 bg-destructive/15 text-destructive animate-in shake-1">
                    <p>{displayError}</p>
                  </div>
                )
              )}
            </div>

            {/* 1. GOOGLE AUTH FIRST (@efferd/auth-5 style) */}
            <div data-field>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border font-bold text-sm transition-all duration-200 shadow-sm active:scale-[0.98] cursor-pointer"
                disabled={pendingAuth}
                onClick={handleGoogleContinue}
              >
                <GoogleIcon className="mr-2.5 size-5" />
                <span>Continue with Google</span>
              </Button>
            </div>

            {/* 2. OR DIVIDER */}
            <div data-field className="py-0.5">
              <AuthDivider>OR</AuthDivider>
            </div>

            {/* 3. EMAIL & CREDENTIALS FORM */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-3">
                <div data-field className="space-y-1.5 text-left">
                  <label htmlFor="login-email" className="text-xs font-semibold text-foreground">
                    Email Address
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    ref={emailRef}
                    required
                    placeholder="xyz@gmail.com"
                    className="h-11 rounded-xl border px-3.5 text-sm font-medium transition-all placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                    autoComplete="email"
                  />
                </div>
                <div data-field className="space-y-1.5 text-left">
                  <label htmlFor="login-password" className="text-xs font-semibold text-foreground">
                    Password
                  </label>
                  <div className="relative group">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      ref={passwordRef}
                      required
                      placeholder="••••••••"
                      className="h-11 rounded-xl border px-3.5 text-sm font-medium transition-all placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground/60 hover:text-primary transition-colors"
                      onClick={() => setShowLoginPassword((v) => !v)}
                    >
                      {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div data-field className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border transition-colors cursor-pointer"
                  />
                  <span className="text-xs font-medium text-muted-foreground">Remember me</span>
                </label>
                <Link
                  href={forgotHref}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <div data-field>
                <Button
                  type="submit"
                  disabled={pendingAuth}
                  className="h-11 w-full rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {pendingAuth ? 'Authenticating...' : 'Sign In'}
                </Button>
              </div>
            </form>
          </FormFieldStagger>

          {/* Legal Notice Footer from @efferd/auth-5 */}
          <p className="pt-4 text-center text-xs text-muted-foreground leading-relaxed">
            By clicking continue, you agree to our{' '}
            <Link className="underline underline-offset-4 hover:text-primary font-medium" href="/terms">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link className="underline underline-offset-4 hover:text-primary font-medium" href="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
