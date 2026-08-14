'use client';

import { type ReactNode } from 'react';
import { PageTransition } from '@/components/admin/page-transition';

export function AuthenticatedLayoutClient({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
