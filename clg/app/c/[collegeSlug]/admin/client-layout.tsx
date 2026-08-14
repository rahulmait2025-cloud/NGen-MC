'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { TenantProvider } from '@/providers/tenant-provider';
import type { TenantBranding } from '@/types/tenant';

/**
 * Client layout for /c/[collegeSlug]/admin/* routes.
 * 
 * PERFORMANCE: Only provides theme and basic tenant branding.
 * Protected data (features, modules) is provided by ProtectedDataProvider
 * in the dashboard layout AFTER auth is confirmed.
 */
export function ClientLayout({
  children,
  collegeSlug,
  initialBranding,
}: {
  children: React.ReactNode;
  collegeSlug: string | null;
  initialBranding: TenantBranding | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TenantProvider
        slug={collegeSlug}
        initialBranding={initialBranding}
      >
        {children}
      </TenantProvider>
    </ThemeProvider>
  );
}
