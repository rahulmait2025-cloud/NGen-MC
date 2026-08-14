'use client';

import React from 'react';
import { TenantProvider } from '@/providers/tenant-provider';
import type { TenantBranding } from '@/types/tenant';
import type { StudentModuleAccessMap } from '@/lib/modules/get-student-module-access';

export function RootClientLayout({
    children,
    collegeSlug,
    initialBranding,
    initialStudentModuleAccess,
}: {
    children: React.ReactNode;
    collegeSlug: string | null;
    initialBranding: TenantBranding | null;
    initialStudentModuleAccess?: StudentModuleAccessMap | null;
}) {
    return (
        <TenantProvider slug={collegeSlug} initialBranding={initialBranding} initialStudentModuleAccess={initialStudentModuleAccess}>
            {children}
        </TenantProvider>
    );
}
