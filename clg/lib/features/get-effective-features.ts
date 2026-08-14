import 'server-only';
import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';

import { createPublicClient } from '@/lib/supabase/server';
import { describeSupabaseError, isSupabaseNetworkError } from '@/lib/supabase/network-error';
import { createEmptyFeatureMap, type FeatureMap } from '@/lib/features/feature-access';
import { isFeatureKey } from '@/lib/features/feature-keys';

export type { FeatureMap } from '@/lib/features/feature-access';

function isMissingRpcError(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    message.includes('get_effective_features') ||
    message.includes('could not find the function')
  );
}

async function loadEffectiveFeaturesFromTables(collegeId: string): Promise<FeatureMap> {
  const supabase = createPublicClient();
  const map = createEmptyFeatureMap();

  const { data: college, error: collegeError } = await supabase
    .from('colleges')
    .select('plan_id')
    .eq('id', collegeId)
    .maybeSingle();

  if (collegeError || !college?.plan_id) {
    return map;
  }

  const { data: planFeatures, error: planError } = await supabase
    .from('plan_features')
    .select('feature_key, enabled')
    .eq('plan_id', college.plan_id);

  if (planError) {
    console.warn(
      `[features] plan_features select failed for ${collegeId}: ${describeSupabaseError(planError)}`,
    );
  } else {
    for (const row of planFeatures ?? []) {
      if (row?.feature_key && isFeatureKey(row.feature_key)) {
        map[row.feature_key] = Boolean(row.enabled);
      }
    }
  }

  const { data: overrides, error: overrideError } = await supabase
    .from('tenant_feature_overrides')
    .select('feature_key, enabled')
    .eq('college_id', collegeId);

  if (overrideError) {
    console.warn(
      `[features] tenant_feature_overrides select failed for ${collegeId}: ${describeSupabaseError(overrideError)}`,
    );
  } else {
    for (const row of overrides ?? []) {
      if (row?.feature_key && isFeatureKey(row.feature_key)) {
        map[row.feature_key] = Boolean(row.enabled);
      }
    }
  }

  return map;
}

async function getEffectiveFeaturesCached(collegeId: string): Promise<FeatureMap> {
  'use cache';
  cacheLife('minutes');
  cacheTag('effective-features');
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc('get_effective_features', { p_college_id: collegeId });

  if (error) {
    if (isMissingRpcError(error) || isSupabaseNetworkError(error)) {
      return loadEffectiveFeaturesFromTables(collegeId);
    }

    const fallback = await loadEffectiveFeaturesFromTables(collegeId);
    const usedFallback = Object.values(fallback).some(Boolean);
    if (usedFallback) {
      return fallback;
    }

    console.warn(
      `[features] get_effective_features failed for ${collegeId}: ${describeSupabaseError(error)}`,
    );
    return createEmptyFeatureMap();
  }

  if (!Array.isArray(data)) {
    return loadEffectiveFeaturesFromTables(collegeId);
  }

  const map = createEmptyFeatureMap();
  for (const row of data as Array<{ feature_key: string; enabled: boolean }>) {
    if (!row?.feature_key || !isFeatureKey(row.feature_key)) {
      continue;
    }
    map[row.feature_key] = Boolean(row.enabled);
  }

  return map;
}

export const getEffectiveFeatures = cache(async function getEffectiveFeatures(
  collegeId: string,
): Promise<FeatureMap> {
  return getEffectiveFeaturesCached(collegeId);
});
