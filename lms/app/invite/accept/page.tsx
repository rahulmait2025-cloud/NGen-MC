import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';

export default function InviteAcceptPage(props: { searchParams: Promise<{ token?: string }> }) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Setting up your account...</div>}>
      <InviteAcceptPageInner searchParams={props.searchParams} />
    </Suspense>
  );
}

async function InviteAcceptPageInner(props: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await props.searchParams;
  const raw = token?.trim();
  if (!raw) {
    redirect('/auth/set-password');
  }
  redirect(`/auth/set-password?token=${encodeURIComponent(raw)}`);
  return null;
}
