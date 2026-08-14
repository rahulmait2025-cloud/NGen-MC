'use client';

import React, { createContext, use, useState, useCallback, useMemo } from 'react';
import { createEmptyFeatureMap, normalizeFeatureMap, type FeatureMap } from '@/lib/features/feature-access';
import { buildTenantModuleAccess, type TenantModuleAccessMap } from '@/lib/modules/module-access';
import type { TenantBranding } from '@/types/tenant';
import { getTenantBrandingSync } from '@/lib/tenant/get-tenant-branding';

interface TenantContextValue {
  branding: TenantBranding;
  slug: string | null;
  features: FeatureMap;
  moduleAccess: TenantModuleAccessMap;
  setFeatures: (features: FeatureMap) => void;
  setModuleAccess: (moduleAccess: TenantModuleAccessMap) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const DEFAULT_BRANDING = getTenantBrandingSync(null);
const DEFAULT_FEATURES = createEmptyFeatureMap();
const DEFAULT_MODULE_ACCESS = buildTenantModuleAccess({ features: DEFAULT_FEATURES });

interface TenantProviderProps {
  children: React.ReactNode;
  slug?: string | null;
  initialBranding?: TenantBranding | null;
  initialFeatures?: FeatureMap | null;
  /** When provided, used as-is (server-computed with overlay). Otherwise built from initialFeatures only. */
  initialModuleAccess?: TenantModuleAccessMap | null;
}

export function TenantProvider({
  children,
  slug = null,
  initialBranding,
  initialFeatures,
  initialModuleAccess,
}: TenantProviderProps) {
  const branding = initialBranding ?? getTenantBrandingSync(slug ?? null);
  
  const [features, setFeaturesState] = useState<FeatureMap>(() => 
    normalizeFeatureMap(initialFeatures ?? DEFAULT_FEATURES)
  );
  
  const [moduleAccess, setModuleAccessState] = useState<TenantModuleAccessMap>(() => 
    initialModuleAccess ?? buildTenantModuleAccess({ features })
  );

  const setFeatures = useCallback((newFeatures: FeatureMap) => {
    setFeaturesState(normalizeFeatureMap(newFeatures));
  }, []);

  const setModuleAccess = useCallback((newModuleAccess: TenantModuleAccessMap) => {
    setModuleAccessState(newModuleAccess);
  }, []);

  const value: TenantContextValue = useMemo(() => ({
    branding,
    slug,
    features,
    moduleAccess,
    setFeatures,
    setModuleAccess,
  }), [branding, slug, features, moduleAccess, setFeatures, setModuleAccess]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = use(TenantContext);
  if (!ctx) {
    return { 
      branding: DEFAULT_BRANDING, 
      slug: null, 
      features: DEFAULT_FEATURES, 
      moduleAccess: DEFAULT_MODULE_ACCESS,
      setFeatures: () => {},
      setModuleAccess: () => {},
    };
  }
  return ctx;
}
