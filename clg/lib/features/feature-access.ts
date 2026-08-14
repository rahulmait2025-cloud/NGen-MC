import { FEATURE_KEYS, type FeatureKey } from '@/lib/features/feature-keys';

export type FeatureMap = Record<FeatureKey, boolean>;

export function createEmptyFeatureMap(): FeatureMap {
  return Object.fromEntries(FEATURE_KEYS.map((key) => [key, false])) as FeatureMap;
}

export function normalizeFeatureMap(input?: Partial<FeatureMap> | null): FeatureMap {
  const normalized = createEmptyFeatureMap();
  if (!input) {
    return normalized;
  }

  for (const featureKey of FEATURE_KEYS) {
    if (featureKey in input) {
      normalized[featureKey] = Boolean(input[featureKey]);
    }
  }

  return normalized;
}
