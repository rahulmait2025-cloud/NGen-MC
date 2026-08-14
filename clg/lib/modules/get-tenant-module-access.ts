import 'server-only';
import { cache } from 'react';

import { createEmptyFeatureMap, type FeatureMap } from '@/lib/features/feature-access';
import { getEffectiveFeatures } from '@/lib/features/get-effective-features';
import { getTenantModuleOverlay } from '@/lib/modules/get-tenant-module-overlay';
import { buildTenantModuleAccess, type ModuleAccessOverlay, type TenantModuleAccessMap } from '@/lib/modules/module-access';

export interface GetTenantModuleAccessOptions {
  collegeId?: string | null;
  features?: Partial<FeatureMap> | null;
  overlay?: ModuleAccessOverlay | null;
}

/**
 * Returns full tenant module access (plan features + optional overlay).
 * When collegeId is provided and overlay is not, overlay is loaded from DB.
 */
export const getTenantModuleAccess = cache(async function getTenantModuleAccess(options: GetTenantModuleAccessOptions = {}): Promise<TenantModuleAccessMap> {
  let features: FeatureMap | undefined;
  let overlay = options.overlay;

  if (options.features) {
    features = options.features as FeatureMap;
  } else if (options.collegeId) {
    const [effectiveFeatures, loadedOverlay] = await Promise.all([
      getEffectiveFeatures(options.collegeId),
      options.overlay === undefined ? getTenantModuleOverlay(options.collegeId) : Promise.resolve(options.overlay),
    ]);
    features = effectiveFeatures;
    if (overlay === undefined) overlay = loadedOverlay;
  }

  if (!features) {
    features = createEmptyFeatureMap();
  }

  return buildTenantModuleAccess({ features, overlay: overlay ?? undefined });
});
