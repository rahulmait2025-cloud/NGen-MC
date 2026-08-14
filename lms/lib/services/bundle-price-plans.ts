import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export interface BundlePricePlansRow {
  id: string;
  bundle_id: string;
  plan_name: string;
  description: string | null;
  validity_days: number | null;
  price_minor: number;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  badge_label?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BundlePricingSummary {
  priceMinor: number | null;
  currency: string;
  pricePlanId: string | null;
  validityDays: number | null;
  isFree: boolean;
  isPurchasable: boolean;
  plans: BundlePricePlansRow[];
}

export async function getActiveBundlePricePlans(
  bundleId: string,
): Promise<BundlePricePlansRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('bundle_price_plans')
    .select('id, bundle_id, plan_name, description, validity_days, price_minor, currency, is_default, is_active, sort_order, badge_label, created_at, updated_at')
    .eq('bundle_id', bundleId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('price_minor', { ascending: true });

  if (error) {
    if (error.code === '42P01') {
      return [];
    }
    throw new Error(`Failed to fetch bundle price plans: ${error.message}`);
  }

  return (data ?? []) as BundlePricePlansRow[];
}

export async function resolveBundlePricing(
  bundleId: string,
  pricingModel: string | null,
  legacySellingPrice: number | null,
  legacyCurrency = 'INR',
): Promise<BundlePricingSummary> {
  const plans = await getActiveBundlePricePlans(bundleId);
  const defaultPlan = plans.find((p) => p.is_default) ?? plans[0];

  if (defaultPlan) {
    const isFree = defaultPlan.price_minor <= 0 || pricingModel === 'free';
    return {
      priceMinor: defaultPlan.price_minor,
      currency: defaultPlan.currency,
      pricePlanId: defaultPlan.id,
      validityDays: defaultPlan.validity_days,
      isFree,
      isPurchasable: !isFree,
      plans,
    };
  }

  const isFree =
    pricingModel === 'free' || legacySellingPrice === 0 || legacySellingPrice == null;

  return {
    priceMinor: legacySellingPrice,
    currency: legacyCurrency,
    pricePlanId: null,
    validityDays: null,
    isFree,
    isPurchasable: !isFree && !!(legacySellingPrice && legacySellingPrice > 0),
    plans: [],
  };
}

async function _getBundlePricePlanById(
  planId: string,
): Promise<BundlePricePlansRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bundle_price_plans')
    .select('id, bundle_id, plan_name, description, validity_days, price_minor, currency, is_default, is_active, sort_order, badge_label, created_at, updated_at')
    .eq('id', planId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch bundle price plan: ${error.message}`);
  return (data as BundlePricePlansRow | null) ?? null;
}
