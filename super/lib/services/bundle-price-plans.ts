import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { BundlePricePlansRow } from '@/types/database';

export const MAX_ACTIVE_BUNDLE_PRICE_PLANS = 3;
export const MAX_ACTIVE_BUNDLE_PRICE_PLANS_ERROR =
  'Only 3 pricing plans are allowed. Delete an existing plan to add a new one.';

export interface CreateBundlePricePlanInput {
  bundle_id: string;
  plan_name: string;
  description?: string;
  validity_days?: number | null;
  price_minor: number;
  currency?: string;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
  badge_label?: string | null;
}

export interface UpdateBundlePricePlanInput {
  plan_name?: string;
  description?: string;
  validity_days?: number | null;
  price_minor?: number;
  currency?: string;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
  badge_label?: string | null;
}

export async function listAllBundlePricePlans(): Promise<BundlePricePlansRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bundle_price_plans')
    .select('*')
    .order('bundle_id', { ascending: true })
    .order('is_active', { ascending: false })
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to list bundle price plans: ${error.message}`);
  return (data ?? []) as BundlePricePlansRow[];
}

export async function getAllBundlePricePlans(bundleId: string): Promise<BundlePricePlansRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bundle_price_plans')
    .select('*')
    .eq('bundle_id', bundleId)
    .order('is_active', { ascending: false })
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch bundle price plans: ${error.message}`);
  return (data ?? []) as BundlePricePlansRow[];
}

export async function createBundlePricePlan(
  input: CreateBundlePricePlanInput,
): Promise<BundlePricePlansRow> {
  const admin = createAdminClient();
  const willBeActive = input.is_active ?? true;

  if (willBeActive) {
    const { count, error: countError } = await admin
      .from('bundle_price_plans')
      .select('id', { count: 'exact', head: true })
      .eq('bundle_id', input.bundle_id)
      .eq('is_active', true);

    if (countError) throw new Error(`Failed to count bundle price plans: ${countError.message}`);
    if ((count ?? 0) >= MAX_ACTIVE_BUNDLE_PRICE_PLANS) {
      throw new Error(MAX_ACTIVE_BUNDLE_PRICE_PLANS_ERROR);
    }
  }

  const { count: totalActive } = await admin
    .from('bundle_price_plans')
    .select('id', { count: 'exact', head: true })
    .eq('bundle_id', input.bundle_id)
    .eq('is_active', true);

  const isFirstPlan = (totalActive ?? 0) === 0;
  const isDefault = isFirstPlan ? true : input.is_default ?? false;

  if (isDefault) {
    await admin
      .from('bundle_price_plans')
      .update({ is_default: false })
      .eq('bundle_id', input.bundle_id)
      .eq('is_default', true);
  }

  const { data, error } = await admin
    .from('bundle_price_plans')
    .insert({
      bundle_id: input.bundle_id,
      plan_name: input.plan_name,
      description: input.description ?? null,
      validity_days: input.validity_days ?? null,
      price_minor: input.price_minor,
      currency: input.currency ?? 'INR',
      is_active: willBeActive,
      is_default: isDefault,
      sort_order: input.sort_order ?? 0,
      badge_label: input.badge_label ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create bundle price plan: ${error.message}`);
  return data as BundlePricePlansRow;
}

export async function updateBundlePricePlan(
  planId: string,
  input: UpdateBundlePricePlanInput,
): Promise<BundlePricePlansRow> {
  const admin = createAdminClient();

  if (input.is_default) {
    const { data: plan } = await admin
      .from('bundle_price_plans')
      .select('bundle_id')
      .eq('id', planId)
      .single();

    if (plan) {
      await admin
        .from('bundle_price_plans')
        .update({ is_default: false })
        .eq('bundle_id', plan.bundle_id)
        .eq('is_default', true);
    }
  }

  const { data, error } = await admin
    .from('bundle_price_plans')
    .update(input)
    .eq('id', planId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update bundle price plan: ${error.message}`);
  return data as BundlePricePlansRow;
}

export async function setDefaultBundlePricePlan(planId: string): Promise<BundlePricePlansRow> {
  return updateBundlePricePlan(planId, { is_default: true, is_active: true });
}

async function _deactivateBundlePricePlan(planId: string): Promise<BundlePricePlansRow> {
  return updateBundlePricePlan(planId, { is_active: false, is_default: false });
}

export async function deleteBundlePricePlan(planId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('bundle_price_plans').delete().eq('id', planId);
  if (error) throw new Error(`Failed to delete bundle price plan: ${error.message}`);
}
