'use client';

import React, { useReducer, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getInviteStatusAction } from '@/lib/actions/invite-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

/**
 * Password setup page for students who arrived via invite magic link.
 * On load: if URL has ?code= (from Supabase redirect), exchange it for a session so the link works in all browsers.
 * After setting password, redirects to college student auth callback (sets JWT, then dashboard). Invite token is one-time use.
 */
type SetPasswordState = {
  password: string;
  confirm: string;
  error: string | null;
  loading: boolean;
  sessionChecked: boolean;
  noSession: boolean;
  linkAlreadyUsed: boolean;
  linkExpired: boolean;
  expiryHoursDisplay: number;
};

const INITIAL_SET_PASSWORD_STATE: SetPasswordState = {
    password: '',
    confirm: '',
    error: null,
    loading: false,
    sessionChecked: false,
    noSession: false,
    linkAlreadyUsed: false,
    linkExpired: false,
    expiryHoursDisplay: 24,
  };

function SetPasswordContent() {
  const { push } = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useReducer(
    (prev: SetPasswordState, next: Partial<SetPasswordState>) => ({ ...prev, ...next }),
    INITIAL_SET_PASSWORD_STATE,
  );



  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const updates: Partial<SetPasswordState> = {};

      // 1) PKCE flow: URL has ?code= (e.g. from some browsers/configs)
      const code = searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else if (typeof window !== 'undefined' && window.location.hash) {
        // 2) Implicit/hash flow: URL has #access_token=...&refresh_token=... (Supabase invite often redirects with hash)
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!setErr) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setState({ noSession: true, sessionChecked: true });
        return;
      }
      // 3) One-time use + configurable expiry: check invite status
      try {
        const res = await getInviteStatusAction();
        if (res.ok) {
          updates.expiryHoursDisplay = res.expiryHours;
          if (res.inviteCompleted) {
            updates.linkAlreadyUsed = true;
            await supabase.auth.signOut();
            window.history.replaceState({}, '', window.location.pathname);
          } else if (res.invitedAt) {
            const invited = new Date(res.invitedAt).getTime();
            const now = Date.now();
            if (now - invited > res.expiryHours * 60 * 60 * 1000) {
              updates.linkExpired = true;
              await supabase.auth.signOut();
              window.history.replaceState({}, '', window.location.pathname);
            }
          }
        }
      } catch {
        // If status check fails, allow them to try (don't block)
      }
      updates.sessionChecked = true;
      setState(updates);
    };
    run();
  }, [searchParams, setState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ error: null });
    if (state.password.length < 8) {
      setState({ error: 'Password must be at least 8 characters.' });
      return;
    }
    if (state.password !== state.confirm) {
      setState({ error: 'Passwords do not match.' });
      return;
    }

    setState({ loading: true });
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setState({ error: 'This invite link is invalid or expired. Please ask your college admin for a new invite.', loading: false });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: state.password });
      if (updateError) {
        setState({ error: updateError.message, loading: false });
        return;
      }
      await fetch('/api/complete-invite', { method: 'POST', credentials: 'include' });

      const res = await fetch('/api/my-student-tenant', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (json.ok && typeof json.slug === 'string') {
        window.location.href = `/c/${encodeURIComponent(json.slug)}/student/auth/callback`;
        return;
      }
      window.location.href = '/';
    } catch {
      setState({ error: 'Could not set your password. Try again.', loading: false });
    }
  };

  if (!state.sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">LoadingΓÇª</p>
      </div>
    );
  }

  if (state.noSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-[420px] shadow-md rounded-xl border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Invalid or expired link</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired. Please contact your college admin for a new invite, or use the sign-in page if you already have an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => push('/')}>
              Go to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.linkAlreadyUsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-[420px] shadow-md rounded-xl border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Link already used</CardTitle>
            <CardDescription>
              This invite link has already been used to set your password. Please sign in with your email and password at your college&apos;s student login page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => push('/')}>
              Go to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.linkExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-[420px] shadow-md rounded-xl border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Invite expired</CardTitle>
            <CardDescription>
              This invite link has expired (invites are valid for {state.expiryHoursDisplay} hours). Please contact your college admin for a new invite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => push('/')}>
              Go to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[420px] shadow-md rounded-xl border border-border bg-card">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight">Set your password</CardTitle>
          <CardDescription>Create a password to access the Student Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={state.password}
                onChange={(e) => setState({ password: e.target.value })}
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                className="h-11 rounded-lg border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium text-foreground">
                Confirm password
              </label>
              <Input
                id="confirm"
                type="password"
                value={state.confirm}
                onChange={(e) => setState({ confirm: e.target.value })}
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="Confirm password"
                className="h-11 rounded-lg border-input bg-background"
              />
            </div>
            {state.error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2 border border-destructive/20">
                {state.error}
              </p>
            )}
            <Button type="submit" className="w-full h-11 rounded-lg font-medium" disabled={state.loading}>
              {state.loading ? 'SavingΓÇª' : 'Set password & continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SetPasswordLegacyClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <p className="text-sm text-muted-foreground">LoadingΓÇª</p>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
