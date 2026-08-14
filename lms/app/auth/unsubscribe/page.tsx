'use client';

import type { ReactNode } from 'react';
import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

function UnsubscribeContent() {
  const _push = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const [email, setEmail] = useState(() => emailParam ?? '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toSubmit = email.trim().toLowerCase();
    if (!toSubmit || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toSubmit)) {
      setMessage('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: toSubmit }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setStatus('done');
      } else {
        setStatus('error');
        setMessage(data?.error ?? 'Could not process your request. Try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not reach the server. Check your connection and try again.');
    }
  };

  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-[420px] shadow-md rounded-xl border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Unsubscribed</CardTitle>
            <CardDescription>
              You will no longer receive student invite emails from this platform. You can still sign in or sign up via your college&apos;s student login page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[420px] shadow-md rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Unsubscribe from invite emails</CardTitle>
          <CardDescription>
            Enter your email to stop receiving student invite emails. Your account and access are not affected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className="h-11"
            />
            {message && (
              <p className="text-sm text-destructive">{message}</p>
            )}
            <Button type="submit" className="w-full h-11" disabled={status === 'loading'}>
              {status === 'loading' ? 'Unsubscribing...' : 'Unsubscribe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UnsubscribePage(): ReactNode {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <p className="text-sm text-muted-foreground">Loading unsubscribe page...</p>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
