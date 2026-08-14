'use client';

import type { ReactNode } from 'react';
import React, { Suspense, useEffect, useReducer, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/providers/tenant-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SessionState = {
  ready: boolean;
  sessionError: string | null;
};

type SessionAction =
  | { type: 'RESET' }
  | { type: 'ERROR'; error: string }
  | { type: 'READY' };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'RESET': return { ready: false, sessionError: null };
    case 'ERROR': return { ...state, sessionError: action.error };
    case 'READY': return { ...state, ready: true };
    default: return state;
  }
}

function ResetPasswordForm() {
  const params = useParams();
  const { push } = useRouter();
  const searchParams = useSearchParams();
  const { branding } = useTenant();
  const collegeSlug = typeof params?.collegeSlug === 'string' ? params.collegeSlug : '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [sessionState, dispatch] = useReducer(sessionReducer, { ready: false, sessionError: null });
  const { ready, sessionError } = sessionState;

  useEffect(() => {
    let cancelled = false;
    async function ensureRecoverySession() {
      const supabase = createClient();
      try {
        const code = searchParams.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) dispatch({ type: 'ERROR', error: 'This reset link is invalid or expired. Please request a new one.' });
            return;
          }
          if (!cancelled) {
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            url.searchParams.delete('type');
            window.history.replaceState({}, '', url.toString());
          }
        }

        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          if (access_token && refresh_token) {
            const { error: sessionErr } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessionErr) {
              if (!cancelled) dispatch({ type: 'ERROR', error: 'This reset link is invalid or expired. Please request a new one.' });
              return;
            }
            if (!cancelled) {
              const url = new URL(window.location.href);
              url.hash = '';
              window.history.replaceState({}, '', url.toString());
            }
          }
        }
      } finally {
        if (!cancelled) dispatch({ type: 'READY' });
      }
    }

    void ensureRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('This reset link is invalid or expired. Please request a new one.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      push(`/c/${encodeURIComponent(collegeSlug)}/admin/dashboard`);
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const displayError = error ?? sessionError;
  const loginHref = collegeSlug ? `/c/${encodeURIComponent(collegeSlug)}/admin/login` : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted-foreground">College Admin * {branding.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">New password</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="h-10"
            />
          </div>

          {displayError && <p className="text-sm text-destructive">{displayError}</p>}

          <Button type="submit" className="w-full h-10" disabled={loading || !ready}>
            {!ready ? 'Preparing...' : loading ? 'Saving...' : 'Update password'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href={loginHref} className="underline-offset-4 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function CollegeAdminResetPasswordPage(): ReactNode {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-muted/30 p-4"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

