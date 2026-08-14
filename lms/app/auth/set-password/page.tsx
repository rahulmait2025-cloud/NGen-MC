import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { InviteAcceptClient } from '@/app/invite/accept/invite-accept-client';
import { getInviteAcceptUiState } from '@/lib/services/invite-accept-state';
import { SetPasswordLegacyClient } from '@/app/auth/set-password/set-password-legacy-client';

export default function SetPasswordPage(props: { searchParams: Promise<{ token?: string }> }) {
  return (
    <Suspense fallback={<SetPasswordFallbackShell />}>
      <SetPasswordPageInner searchParams={props.searchParams} />
    </Suspense>
  );
}

async function SetPasswordPageInner(props: { searchParams: Promise<{ token?: string }> }): Promise<ReactNode> {
  const { token } = await props.searchParams;
  const plainToken = token?.trim() || null;

  if (plainToken) {
    const { state, expiryHours } = await getInviteAcceptUiState(plainToken);
    return (
      <InviteAcceptClient token={plainToken} initialState={state} expiryHours={expiryHours} />
    );
  }

  return (
    <Suspense
      fallback={
        <SetPasswordFallbackShell />
      }
    >
      <SetPasswordLegacyClient />
    </Suspense>
  );
}

function SetPasswordFallbackShell() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <p className="text-sm text-muted-foreground">Preparing your account...</p>
    </div>
  );
}
