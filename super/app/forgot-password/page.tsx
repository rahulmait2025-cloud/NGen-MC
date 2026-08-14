'use client';

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function SuperAdminForgotPasswordPage(): ReactNode {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);
    try {
      await fetch('/api/auth-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'password_reset_requested', email }),
      }).catch(() => undefined);

      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-background to-black p-4">
      <Card className="w-full max-w-sm shadow-2xl border-border/40 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-semibold tracking-tight">Reset password</CardTitle>
          <CardDescription>Super Admin Account</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
                autoComplete="email"
                placeholder="super@admin.com"
                className="h-11 rounded-lg"
              />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20">{error}</p>}
            {sent && (
              <p className="text-sm text-green-600 bg-green-500/10 p-3 rounded-md border border-green-500/20">
                If that email exists, a reset link has been sent. Please check your inbox.
              </p>
            )}

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/40 pt-6 pb-6 mt-2">
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:underline transition-colors">Back to sign in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
