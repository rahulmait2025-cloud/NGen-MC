import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveDiscoverableVariantItemScope } from '@/lib/services/student-discoverable-catalog';
import { getActivePricePlansForSource } from '@/lib/services/course-price-plans';

export interface VariantPurchaseInfo {
  variantId: string;
  masterCourseId: string;
  title: string;
  priceMinor: number;
  currency: string;
  pricingSource: 'variant_price_plan' | 'variant_selling_price';
  defaultPricePlanId: string | null;
  pricePlans: Array<{
    id: string;
    plan_name: string;
    description: string | null;
    validity_days: number | null;
    price_minor: number;
    currency: string;
    is_default: boolean;
  }>;
}

/** Resolve variant checkout pricing — price plans first, selling_price legacy fallback. */
export async function getVariantPurchaseInfo(
  variantId: string,
  masterCourseId: string,
  collegeId: string | null,
): Promise<VariantPurchaseInfo | null> {
  const sb = createAdminClient();

  const scope = await resolveDiscoverableVariantItemScope(variantId, masterCourseId, collegeId);
  if (!scope) {
    return null;
  }

  const { data: variant, error } = await sb
    .from('course_variants')
    .select('id, master_course_id, title, selling_price, pricing_model, publish_status, show_as_paid_course')
    .eq('id', variantId)
    .eq('master_course_id', masterCourseId)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (error || !variant) {
    return null;
  }

  const pricingModel = (variant as { pricing_model: string | null }).pricing_model;
  if (pricingModel === 'free') {
    return null;
  }

  const pricePlans = await getActivePricePlansForSource('course_variant', variantId);
  const defaultPlan = pricePlans.find((p) => p.is_default) ?? pricePlans[0] ?? null;

  if (defaultPlan) {
    return {
      variantId: (variant as { id: string }).id,
      masterCourseId: (variant as { master_course_id: string }).master_course_id,
      title: (variant as { title: string }).title,
      priceMinor: defaultPlan.price_minor,
      currency: defaultPlan.currency,
      pricingSource: 'variant_price_plan',
      defaultPricePlanId: defaultPlan.id,
      pricePlans,
    };
  }

  const sellingPrice = (variant as { selling_price: number | null }).selling_price;
  if (!sellingPrice || sellingPrice <= 0) {
    return null;
  }

  return {
    variantId: (variant as { id: string }).id,
    masterCourseId: (variant as { master_course_id: string }).master_course_id,
    title: (variant as { title: string }).title,
    priceMinor: sellingPrice,
    currency: 'INR',
    pricingSource: 'variant_selling_price',
    defaultPricePlanId: null,
    pricePlans: [],
  };
}
