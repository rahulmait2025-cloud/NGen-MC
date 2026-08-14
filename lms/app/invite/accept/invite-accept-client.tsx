'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { InviteAcceptUiState } from '@/lib/types/invite-accept';

function stateTitle(state: InviteAcceptUiState): string {
  switch (state) {
    case 'missing_token':
      return 'Missing invite link';
    case 'invalid':
      return 'Invalid invite link';
    case 'revoked':
      return 'Invite revoked';
    case 'already_used':
      return 'Invite already used';
    case 'expired':
      return 'Invite expired';
    case 'ok':
      return 'Set your password';
    default:
      return 'Invite';
  }
}

function stateDescription(state: InviteAcceptUiState, expiryHours: number): string {
  switch (state) {
    case 'missing_token':
      return 'Open the full link from your invite email (it must include a token).';
    case 'invalid':
      return 'This link is not valid. Ask your administrator for a new student invite.';
    case 'revoked':
      return 'This invite was cancelled. Ask your administrator for a new invite.';
    case 'already_used':
      return 'This invite was already used to set up your account. Sign in at your college student login page.';
    case 'expired':
      return `This invite has expired (invites are valid for ${expiryHours} hours). Ask your administrator for a new invite.`;
    case 'ok':
      return 'Create a password to access the Student Portal.';
    default:
      return '';
  }
}

export function InviteAcceptClient(props: {
  token: string;
  initialState: InviteAcceptUiState;
  expiryHours: number;
}) {
  const { push } = useRouter();
  const { initialState, expiryHours, token } = props;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (initialState !== 'ok') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-[420px] shadow-md rounded-xl border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">{stateTitle(initialState)}</CardTitle>
            <CardDescription>{stateDescription(initialState, expiryHours)}</CardDescription>
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
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; redirectUrl?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Could not create your account. Try again.');
        setLoading(false);
        return;
      }
      if (typeof json.redirectUrl === 'string' && json.redirectUrl.startsWith('/')) {
        window.location.href = json.redirectUrl;
        return;
      }
      window.location.href = '/';
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[420px] shadow-md rounded-xl border border-border bg-card">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight">{stateTitle('ok')}</CardTitle>
          <CardDescription>{stateDescription('ok', expiryHours)}</CardDescription>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="Confirm password"
                className="h-11 rounded-lg border-input bg-background"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2 border border-destructive/20">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full h-11 rounded-lg font-medium" disabled={loading}>
              {loading ? 'Saving...' : 'Set password & continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
