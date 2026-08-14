'use client';

import type { ReactNode } from 'react';
import React, { useEffect, useReducer } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateRecoveryPassword } from './actions';

interface RecoveryResetPasswordFormProps {
  hasRecoverySession: boolean;
}

export function RecoveryResetPasswordForm({
  hasRecoverySession,
}: RecoveryResetPasswordFormProps): ReactNode {
  const { push } = useRouter();

  type ResetState = {
    password: string;
    confirm: string;
    error: string | null;
    loading: boolean;
    ready: boolean;
    noSession: boolean;
  };

  const [state, setState] = useReducer(
    (prev: ResetState, next: Partial<ResetState>) => ({ ...prev, ...next }),
    {
      password: '',
      confirm: '',
      error: null,
      loading: false,
      ready: false,
      noSession: !hasRecoverySession,
    },
  );

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      if (hasRecoverySession) {
        if (!cancelled) setState({ ready: true, noSession: false });
        return;
      }

      const supabase = createClient();

      console.warn('[college-admin-reset-password] client fallback', {
        hashPresent: window.location.hash.includes('access_token'),
      });

      const hash = window.location.hash;
      if (hash.includes('access_token') && hash.includes('refresh_token')) {
        const hashParams = new URLSearchParams(hash.slice(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!sessionError) {
            window.history.replaceState({}, '', window.location.pathname);
            const { data: { user } } = await supabase.auth.getUser();
            if (!cancelled) setState({ ready: true, noSession: !user });
            return;
          }
        }
      }

      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get('token_hash');
      const otpType = url.searchParams.get('type');
      if (tokenHash && otpType === 'recovery') {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (!verifyError) {
          url.searchParams.delete('token_hash');
          url.searchParams.delete('type');
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
          const { data: { user } } = await supabase.auth.getUser();
          if (!cancelled) setState({ ready: true, noSession: !user });
          return;
        }
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;

      console.warn('[college-admin-reset-password] session check', {
        sessionPresent: Boolean(user),
        userError: userError?.message ?? null,
      });

      setState({ ready: true, noSession: userError != null || !user });
    }

    void establishRecoverySession();
    return () => { cancelled = true; };
  }, [hasRecoverySession]);

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
      const result = await updateRecoveryPassword(state.password);
      if (!result.ok) {
        setState({ error: result.message, loading: false });
        return;
      }
      push('/login?reset=success');
    } catch {
      setState({ error: 'Could not save your new password. Try again.', loading: false });
    }
  };

  if (!state.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">Preparing...</p>
      </div>
    );
  }

  if (state.noSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Invalid Link</h1>
            <p className="text-sm text-muted-foreground">College Admin Portal</p>
          </div>
          <p className="text-sm text-destructive">
            This reset link is invalid or expired. Please request a new one.
          </p>
          <Button variant="outline" className="w-full h-10 rounded-xl" onClick={() => push('/forgot-password')}>
            Request new link
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/login" prefetch={false} className="underline-offset-4 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted-foreground">College Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">New password</label>
            <Input
              id="password"
              type="password"
              value={state.password}
              onChange={(ev) => setState({ password: ev.target.value })}
              required
              autoComplete="new-password"
              minLength={8}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
            <Input
              id="confirm"
              type="password"
              value={state.confirm}
              onChange={(ev) => setState({ confirm: ev.target.value })}
              required
              autoComplete="new-password"
              minLength={8}
              className="h-10 rounded-xl"
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="w-full h-10 rounded-xl" disabled={state.loading}>
            {state.loading ? 'Saving...' : 'Update password'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/login" prefetch={false} className="underline-offset-4 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
