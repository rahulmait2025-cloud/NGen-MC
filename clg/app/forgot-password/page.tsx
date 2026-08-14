'use client';

import type { ReactNode } from 'react';
import React, { useReducer } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ForgotPasswordState = {
  collegeSlug: string;
  email: string;
  error: string | null;
  sent: boolean;
  loading: boolean;
};

type ForgotPasswordAction =
  | { type: 'SET_COLLEGE_SLUG'; payload: string }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SENT'; payload: boolean }
  | { type: 'RESET' };

function forgotPasswordReducer(state: ForgotPasswordState, action: ForgotPasswordAction): ForgotPasswordState {
  switch (action.type) {
    case 'SET_COLLEGE_SLUG':
      return { ...state, collegeSlug: action.payload };
    case 'SET_EMAIL':
      return { ...state, email: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SENT':
      return { ...state, sent: action.payload };
    case 'RESET':
      return { ...state, error: null, sent: false, loading: true };
    default:
      return state;
  }
}

export default function CollegeAdminRootForgotPasswordPage(): ReactNode {
  const { back } = useRouter();
  const [state, dispatch] = useReducer(forgotPasswordReducer, {
    collegeSlug: '',
    email: '',
    error: null,
    sent: false,
    loading: false,
  });

  const loginHref = '/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'RESET' });

    const normalizedSlug = state.collegeSlug.trim().toLowerCase();
    const normalizedEmail = state.email.trim().toLowerCase();

    if (!normalizedSlug) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter your college code.' });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      const supabase = createClient();
      const baseUrl =
        process.env.NEXT_PUBLIC_COLLEGE_ADMIN_APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        window.location.origin;
      const redirectTo = `${baseUrl}/c/${encodeURIComponent(normalizedSlug)}/admin/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (resetError) {
        dispatch({ type: 'SET_ERROR', payload: resetError.message });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      dispatch({ type: 'SET_SENT', payload: true });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Something went wrong. Try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">College Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="college" className="text-sm font-medium">College code</label>
            <Input
              id="college"
              value={state.collegeSlug}
              onChange={(ev) => dispatch({ type: 'SET_COLLEGE_SLUG', payload: ev.target.value })}
              required
              placeholder="e.g. abc-college"
              className="h-10"
              autoComplete="organization"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              value={state.email}
              onChange={(ev) => dispatch({ type: 'SET_EMAIL', payload: ev.target.value })}
              required
              autoComplete="email"
              placeholder="admin@college.edu"
              className="h-10"
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.sent && (
            <p className="text-sm text-muted-foreground">
              If that email exists, a reset link has been sent. Please check your inbox.
            </p>
          )}

          <Button type="submit" className="w-full h-10" disabled={state.loading}>
            {state.loading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href={loginHref} className="underline-offset-4 hover:underline">Back to sign in</Link>
          {' '}
          ·
          {' '}
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => back()}
          >
            Go back
          </button>
        </p>
      </div>
    </div>
  );
}

