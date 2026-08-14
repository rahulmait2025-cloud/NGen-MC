'use client';

import React, { createContext, use, useState, useCallback, useMemo } from 'react';
import type { TenantBranding } from '@/types/tenant';
import { getTenantBrandingSync } from '@/lib/tenant/get-tenant-branding';
import type { StudentModuleAccessMap } from '@/lib/modules/get-student-module-access';

interface TenantContextValue {
  branding: TenantBranding;
  slug: string | null;
  studentModuleAccess: StudentModuleAccessMap;
  setStudentModuleAccess: (moduleAccess: StudentModuleAccessMap) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const DEFAULT_BRANDING = getTenantBrandingSync(null);
const DEFAULT_STUDENT_MODULE_ACCESS: StudentModuleAccessMap = {};

interface TenantProviderProps {
  children: React.ReactNode;
  slug?: string | null;
  initialBranding?: TenantBranding | null;
  initialStudentModuleAccess?: StudentModuleAccessMap | null;
}

export function TenantProvider({ children, slug = null, initialBranding, initialStudentModuleAccess }: TenantProviderProps) {
  const branding = initialBranding ?? getTenantBrandingSync(slug ?? null);
  
  const [studentModuleAccess, setStudentModuleAccessState] = useState<StudentModuleAccessMap>(
    () => initialStudentModuleAccess ?? DEFAULT_STUDENT_MODULE_ACCESS
  );

  const setStudentModuleAccess = useCallback((newModuleAccess: StudentModuleAccessMap) => {
    setStudentModuleAccessState(newModuleAccess);
  }, []);

  const value: TenantContextValue = useMemo(() => ({
    branding,
    slug,
    studentModuleAccess,
    setStudentModuleAccess,
  }), [branding, slug, studentModuleAccess, setStudentModuleAccess]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = use(TenantContext);
  if (!ctx) {
    return { 
      branding: DEFAULT_BRANDING, 
      slug: null, 
      studentModuleAccess: DEFAULT_STUDENT_MODULE_ACCESS,
      setStudentModuleAccess: () => {},
    };
  }
  return ctx;
}
