import React, { Suspense } from 'react';
import type { ReactNode } from 'react';
import { UnifiedAuthScreen } from '@/components/auth/unified-auth-screen';
import { LoginPageSkeleton } from '@/components/skeletons/login-page-skeleton';

export default function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <StudentLoginPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function StudentLoginPageInner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const resolvedParams = await searchParams;
  return <UnifiedAuthScreen mode='tenant' searchParams={resolvedParams} />;
}
