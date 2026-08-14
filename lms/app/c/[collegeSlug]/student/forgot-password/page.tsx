'use client';

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getStudentPasswordResetRedirectUrl } from '@/lib/auth/student-auth-urls';
import { useTenant } from '@/providers/tenant-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function isRateLimitOrNetworkError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('rate') ||
    normalized.includes('too many') ||
    normalized.includes('network') ||
    normalized.includes('fetch')
  );
}

export default function StudentForgotPasswordPage(): ReactNode {
  const params = useParams();
  const { branding } = useTenant();
  const collegeSlug = typeof params?.collegeSlug === 'string' ? params.collegeSlug : '';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginHref = '/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      await fetch('/api/student/auth-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'password_reset_requested',
          slug: collegeSlug,
          email: normalizedEmail,
        }),
      }).catch(() => undefined);

      const supabase = createClient();
      const redirectTo = getStudentPasswordResetRedirectUrl(
        collegeSlug,
        window.location.origin,
      );
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo },
      );

      if (resetError) {
        if (isRateLimitOrNetworkError(resetError.message)) {
          setError(
            'Too many requests. Wait a few minutes before trying again.',
          );
          return;
        }
      }

      setSent(true);
    } catch {
      setError(
        'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">Student Portal · {branding.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              autoComplete="email"
              placeholder="you@college.edu"
              className="h-10 rounded-xl"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {sent && (
            <p className="text-sm text-muted-foreground">
              If that email exists, a reset link has been sent. Please check your inbox.
            </p>
          )}

          <Button type="submit" className="w-full h-10 rounded-xl" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href={loginHref} prefetch={false} className="underline-offset-4 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
