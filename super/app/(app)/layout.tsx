import React, { Suspense } from 'react';
import type { ReactNode } from 'react';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { AppLayoutClient } from './app-layout-client';
import { AppLayoutFallback } from './app-layout-fallback';

export default function AppLayout({ children }: { children: React.ReactNode }): ReactNode {
  return (
    <Suspense fallback={<AppLayoutFallback />}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  );
}

async function AppLayoutInner({ children }: { children: React.ReactNode }): Promise<ReactNode> {
  await requireSuperadmin();

  return (
    <AppLayoutClient>
      {children}
    </AppLayoutClient>
  );
}
