import type { OrderStatus, PaymentStatus, CouponStatus, PurchaseSource } from '@/types/database';
export type { OrderStatus, PaymentStatus, CouponStatus, PurchaseSource };

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const INR_COMPACT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });
const USD_COMPACT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const DATE_FULL = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatters = new Map<string, Intl.NumberFormat>();

function cachedFormatter(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
    formatters.set(currency, f);
  }
  return f;
}

export function fmtCurrency(amountMinor: number, currency = 'INR'): string {
  if (currency === 'INR') return INR.format(amountMinor / 100);
  return cachedFormatter(currency).format(amountMinor / 100);
}

export function fmtCompact(amountMinor: number, currency = 'INR'): string {
  if (currency === 'INR') return INR_COMPACT.format(amountMinor / 100);
  return USD_COMPACT.format(amountMinor / 100);
}

export function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return DATE_FULL.format(new Date(dateStr));
}

export function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
}

import { format } from 'date-fns';

export const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400' },
  refunded: { label: 'Refunded', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' },
};

export const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  captured: { label: 'Captured', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
  initiated: { label: 'Initiated', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' },
  authorized: { label: 'Authorized', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400' },
  refunded: { label: 'Refunded', className: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400' },
};

export const couponStatusConfig: Record<CouponStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
  expired: { label: 'Expired', className: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400' },
  exhausted: { label: 'Exhausted', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  disabled: { label: 'Disabled', className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400' },
};

export function srcLabel(source: PurchaseSource): string {
  return source === 'college_admin' ? 'College' : 'LMS';
}

export function entityLabel(entityType: string): string {
  switch (entityType) {
    case 'master_course': return 'Course';
    case 'course_bundle': return 'Bundle';
    case 'course_variant': return 'Variant';
    case 'paid_mentorship_booking': return 'Mentorship';
    default: return entityType;
  }
}
