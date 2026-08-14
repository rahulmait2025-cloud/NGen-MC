export type ProductPricingType = 'course' | 'variant' | 'bundle' | 'bootcamp';

export interface ProductPricingPlan {
  id: string;
  plan_name: string;
  description?: string | null;
  validity_days?: number | null;
  price_minor: number;
  currency: string;
  is_default: boolean;
  badge_label?: string | null;
}

export const MAX_ACTIVE_PRICE_PLANS = 3;

export const MAX_ACTIVE_PRICE_PLANS_ERROR =
  'Only 3 pricing plans are allowed. Delete an existing plan to add a new one.';
