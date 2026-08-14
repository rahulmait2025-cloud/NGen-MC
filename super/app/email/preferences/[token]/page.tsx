'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useRef, useReducer } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, Check, Mail } from 'lucide-react';

interface UnsubscribePageProps {
  params: Promise<{ token: string }>;
}

interface PreferenceData {
  email: string;
  marketing: boolean;
  announcements: boolean;
  productUpdates: boolean;
  notices: boolean;
  operational: boolean;
  global: boolean;
}

function maskEmail(email: string): string {
  if (!email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local.slice(-1) : local;
  return `${maskedLocal}@${domain}`;
}

type PrefsUiState = { loading: boolean; saving: boolean; error: string | null; success: boolean };
type PrefsUiAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_END' }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_END' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_SUCCESS' }
  | { type: 'CLEAR_ERROR' };

function prefsUiReducer(state: PrefsUiState, action: PrefsUiAction): PrefsUiState {
  switch (action.type) {
    case 'LOAD_START': return { ...state, loading: true, error: null };
    case 'LOAD_END': return { ...state, loading: false };
    case 'SAVE_START': return { ...state, saving: true, error: null };
    case 'SAVE_END': return { ...state, saving: false };
    case 'SET_ERROR': return { ...state, error: action.message };
    case 'SET_SUCCESS': return { ...state, success: true };
    case 'CLEAR_ERROR': return { ...state, error: null };
  }
}

export default function PreferencesPage({ params }: UnsubscribePageProps): ReactNode {

  const [{ loading, saving, error, success }, dispatch] = useReducer(prefsUiReducer, { loading: true, saving: false, error: null, success: false });
  const [preferences, setPreferences] = useState<PreferenceData | null>(null);
  const tokenRef = useRef<string>('');

  useEffect(() => {
    params.then((p) => {
      tokenRef.current = p.token;
      if (tokenRef.current) {
        loadPreferences();
      }
    });
  }, [params]);

  async function loadPreferences() {
    try {
      const res = await fetch(`/api/email/preferences?token=${tokenRef.current}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        dispatch({ type: 'SET_ERROR', message: data.error || 'Invalid link' });
      } else {
        setPreferences(data);
      }
    } catch {
      dispatch({ type: 'SET_ERROR', message: 'Failed to load preferences' });
    } finally {
      dispatch({ type: 'LOAD_END' });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;

    dispatch({ type: 'SAVE_START' });

    try {
      const res = await fetch(`/api/email/preferences?token=${tokenRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketing: preferences.marketing,
          announcements: preferences.announcements,
          productUpdates: preferences.productUpdates,
          notices: preferences.notices,
          operational: false,
          global: preferences.global,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        dispatch({ type: 'SET_ERROR', message: data.error || 'Failed to update preferences' });
      } else {
        dispatch({ type: 'SET_SUCCESS' });
      }
    } catch {
      dispatch({ type: 'SET_ERROR', message: 'Failed to update preferences' });
    } finally {
      dispatch({ type: 'SAVE_END' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="size-5" />
              Preferences Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your email preferences have been updated.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            Email Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {preferences?.email && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Managing preferences for: </span>
                <span className="font-medium">{maskEmail(preferences.email)}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="marketing"
                  checked={preferences?.marketing ?? false}
                  onCheckedChange={(checked) =>
                    setPreferences((p) => p ? { ...p, marketing: checked as boolean } : p)
                  }
                />
                <Label htmlFor="marketing" className="text-sm">
                  Unsubscribe from Growth / Marketing
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="announcements"
                  checked={preferences?.announcements ?? false}
                  onCheckedChange={(checked) =>
                    setPreferences((p) => p ? { ...p, announcements: checked as boolean } : p)
                  }
                />
                <Label htmlFor="announcements" className="text-sm">
                  Unsubscribe from Academics
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="productUpdates"
                  checked={preferences?.productUpdates ?? false}
                  onCheckedChange={(checked) =>
                    setPreferences((p) => p ? { ...p, productUpdates: checked as boolean } : p)
                  }
                />
                <Label htmlFor="productUpdates" className="text-sm">
                  Unsubscribe from Mentorship / Community
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="notices"
                  checked={preferences?.notices ?? false}
                  onCheckedChange={(checked) =>
                    setPreferences((p) => p ? { ...p, notices: checked as boolean } : p)
                  }
                />
                <Label htmlFor="notices" className="text-sm">
                  Unsubscribe from Notices
                </Label>
              </div>

              <div className="flex items-center gap-2 opacity-60">
                <Checkbox id="operational" checked={false} disabled />
                <Label htmlFor="operational" className="text-sm text-muted-foreground">
                  Transactional / Essential (always enabled)
                </Label>
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="global"
                    checked={preferences?.global ?? false}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => p ? { ...p, global: checked as boolean } : p)
                    }
                  />
                  <Label htmlFor="global" className="text-sm font-medium">
                    Unsubscribe from all non-essential emails
                  </Label>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
