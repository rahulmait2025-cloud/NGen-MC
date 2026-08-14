import React, { Suspense } from 'react';
import type { ReactNode } from 'react';
import { UnifiedAuthScreen } from '@/components/auth/unified-auth-screen';
import { LoginPageSkeleton } from '@/components/skeletons/login-page-skeleton';

export default function UnifiedAuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <UnifiedAuthPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function UnifiedAuthPageInner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const resolvedParams = await searchParams;
  return <UnifiedAuthScreen mode='global' searchParams={resolvedParams} />;
}
