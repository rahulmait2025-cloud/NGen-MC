import { createEmptyFeatureMap, normalizeFeatureMap, type FeatureMap } from '@/lib/features/feature-access';
import { getModuleRegistry, type ModuleAudience, type ModuleDefinition, type ModuleId } from '@/lib/modules/module-registry';

export type ModuleAccessOverlay = Partial<Record<ModuleId, Partial<Record<ModuleAudience, 'allow' | 'deny' | 'inherit'>>>>;

export interface ModuleAudienceAccess {
  audience: ModuleAudience;
  allowed: boolean;
  source: 'default' | 'feature' | 'manual';
  reason: string;
  featureKey: string | null | undefined;
  featureEnabled: boolean;
  manualMode: 'allow' | 'deny' | 'inherit';
}

export type TenantModuleAccessMap = Record<ModuleId, {
  module: ModuleDefinition<ModuleId>;
  byAudience: Record<ModuleAudience, ModuleAudienceAccess>;
}>;

export interface ResolveTenantModuleAccessOptions {
  features?: FeatureMap;
  overlay?: ModuleAccessOverlay;
}

function resolveAudienceAccess(
  moduleDefinition: ModuleDefinition<ModuleId>,
  audience: ModuleAudience,
  features: FeatureMap,
  overlay?: ModuleAccessOverlay | null
): ModuleAudienceAccess {
  const isAudienceEnabled = moduleDefinition.audiences.includes(audience);
  const featureEnabled = isAudienceEnabled && (moduleDefinition.featureKey ? features[moduleDefinition.featureKey] : true);
  const manualMode = overlay?.[moduleDefinition.id]?.[audience] ?? 'inherit';

  if (manualMode === 'deny') {
    return {
      audience,
      allowed: false,
      source: 'manual',
      reason: 'manually_denied',
      featureKey: moduleDefinition.featureKey,
      featureEnabled,
      manualMode,
    };
  }

  if (manualMode === 'allow') {
    return {
      audience,
      allowed: true,
      source: 'manual',
      reason: 'manually_allowed',
      featureKey: moduleDefinition.featureKey,
      featureEnabled,
      manualMode,
    };
  }

  return {
    audience,
    allowed: featureEnabled,
    source: moduleDefinition.featureKey ? 'feature' : 'default',
    reason: featureEnabled ? 'enabled' : 'feature_disabled',
    featureKey: moduleDefinition.featureKey,
    featureEnabled,
    manualMode,
  };
}

export function buildTenantModuleAccess(options: ResolveTenantModuleAccessOptions = {}): TenantModuleAccessMap {
  const features = options.features ? normalizeFeatureMap(options.features) : createEmptyFeatureMap();
  const registry = getModuleRegistry();

  return Object.fromEntries(
    Object.entries(registry).map(([moduleId, moduleDefinition]) => {
      const typedModuleId = moduleId as ModuleId;
      const typedModuleDefinition = moduleDefinition as ModuleDefinition<ModuleId>;

      return [
        typedModuleId,
        {
          module: typedModuleDefinition,
          byAudience: {
            college_admin: resolveAudienceAccess(typedModuleDefinition, 'college_admin', features, options.overlay),
            student: resolveAudienceAccess(typedModuleDefinition, 'student', features, options.overlay),
          },
        },
      ];
    })
  ) as TenantModuleAccessMap;
}


