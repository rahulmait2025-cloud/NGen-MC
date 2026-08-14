import React, { Suspense } from 'react';
import type { ReactNode } from 'react';
import { UnifiedAuthScreen } from '@/components/auth/unified-auth-screen';

export default function UnifiedAuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8F7F5] p-4"><p className="text-sm text-muted-foreground">Loading...</p></div>}>
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
  return <UnifiedAuthScreen mode="global" searchParams={resolvedParams} />;
}
