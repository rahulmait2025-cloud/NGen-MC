import type { ProductPricingType } from './types';

export function formatPlanPrice(minor: number, currency: string): string {
  if (currency === 'INR') {
    return `₹${(minor / 100).toLocaleString('en-IN')}`;
  }
  return `${currency} ${(minor / 100).toLocaleString()}`;
}

/** Student-facing validity label, e.g. "30 days access" or "Lifetime access". */
export function formatPlanValidityAccess(days: number | null | undefined): string {
  if (days == null) return 'Lifetime access';
  if (days === 30) return '30 days access';
  if (days === 90) return '90 days access';
  if (days === 180) return '180 days access';
  if (days === 365) return '1 year access';
  return `${days} days access`;
}

export function defaultCtaLabel(productType: ProductPricingType): string {
  switch (productType) {
    case 'bundle':
      return 'Enroll In Bundle Now';
    case 'bootcamp':
      return 'Enroll In Bootcamp';
    default:
      return 'Enroll Now';
  }
}
