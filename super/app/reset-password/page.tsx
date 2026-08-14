'use client';

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function SuperAdminResetPasswordPage(): ReactNode {
  const { push } = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
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

      push('/dashboard');
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-background to-black p-4">
      <Card className="w-full max-w-sm shadow-2xl border-border/40 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-semibold tracking-tight">Set a new password</CardTitle>
          <CardDescription>Super Admin Account</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="h-11 rounded-lg"
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
                className="h-11 rounded-lg"
              />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20">{error}</p>}

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? 'Saving...' : 'Update password'}
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
