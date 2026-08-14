'use client';

import React from 'react';
import { useSWR } from '@/lib/client-cache';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Package,
  CreditCard,
} from 'lucide-react';

interface PaymentRow {
  id: string;
  order_id: string;
  gateway_name: string;
  gateway_payment_id: string | null;
  gateway_order_id: string | null;
  amount_minor: number;
  currency: string;
  status: string;
  method: string | null;
  captured_at: string | null;
  created_at: string;
  failed_at: string | null;
  failure_reason: string | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  entity_type: string;
  entity_id: string;
  unit_amount_minor: number;
  discount_amount_minor: number;
  total_amount_minor: number;
  currency: string;
}

const DETAILS_CURRENCY_FMT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const DETAILS_CURRENCY_FMT_OTHER = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function formatCurrency(amountMinor: number, currency: string = 'INR') {
  if (currency === 'INR') return DETAILS_CURRENCY_FMT.format(amountMinor / 100);
  return DETAILS_CURRENCY_FMT_OTHER.format(amountMinor / 100);
}

function paymentStatusConfig(status: string) {
  switch (status) {
    case 'captured':
      return { label: 'Captured', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' };
    case 'authorized':
      return { label: 'Authorized', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' };
    case 'initiated':
      return { label: 'Initiated', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' };
    case 'failed':
      return { label: 'Failed', className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400' };
    default:
      return { label: status, className: 'bg-muted text-muted-foreground' };
  }
}

async function fetchOrderDetails(orderId: string) {
  const response = await fetch(`/api/commerce/orders/${orderId}/details`);
  if (!response.ok) {
    throw new Error('Failed to fetch order details');
  }
  return response.json() as Promise<{
    payments: PaymentRow[];
    items: OrderItemRow[];
  }>;
}

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="rounded-lg bg-muted/60 p-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function OrderDetailsContent({ orderId }: { orderId: string }) {
  const { data: details, isLoading } = useSWR(
    `order-details-${orderId}`,
    () => fetchOrderDetails(orderId),
    { fallbackData: { payments: [], items: [] } }
  );

  if (isLoading) {
    return (
      <div className="space-y-6 py-2">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded-md bg-muted/50 shimmer" />
          <div className="h-[120px] rounded-xl border border-border/40 bg-card/50 shimmer" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-40 rounded-md bg-muted/50 shimmer" />
          <div className="h-[120px] rounded-xl border border-border/40 bg-card/50 shimmer" />
        </div>
      </div>
    );
  }

  if (!details || (details.items.length === 0 && details.payments.length === 0)) {
    return <EmptyState message="No additional details for this order." />;
  }

  return (
    <div className="space-y-6">
      {/* Line Items */}
      {details.items.length > 0 && (
        <div>
          <SectionHeader icon={Package} label="Line Items" />
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 hover:bg-transparent">
                  <TableHead className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Type</TableHead>
                  <TableHead className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Unit</TableHead>
                  <TableHead className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Discount</TableHead>
                  <TableHead className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.items.map((item) => (
                  <TableRow key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium capitalize">
                          {item.entity_type === 'course_bundle' ? 'Bundle' : 'Variant'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground/80">
                          {item.entity_id.slice(0, 12)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right text-sm font-mono tabular-nums">
                      {formatCurrency(item.unit_amount_minor, item.currency)}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right text-sm font-mono tabular-nums">
                      {item.discount_amount_minor > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          -{formatCurrency(item.discount_amount_minor, item.currency)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right text-sm font-semibold font-mono tabular-nums">
                      {formatCurrency(item.total_amount_minor, item.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Payment Records */}
      {details.payments.length > 0 && (
        <div>
          <SectionHeader icon={CreditCard} label="Gateway Transactions" />
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 hover:bg-transparent">
                  <TableHead className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Payment ID</TableHead>
                  <TableHead className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.payments.map((payment) => {
                  const cfg = paymentStatusConfig(payment.status);
                  return (
                    <TableRow key={payment.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium truncate max-w-[140px]" title={payment.gateway_payment_id || ''}>
                            {payment.gateway_payment_id ? payment.gateway_payment_id.slice(0, 16) + '...' : '-'}
                          </span>
                          {payment.gateway_payment_id && (
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide">Razorpay</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-right text-sm font-mono font-semibold tabular-nums">
                        {formatCurrency(payment.amount_minor, payment.currency)}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-center">
                        <Badge className={`${cfg.className} border text-[11px] font-semibold px-2 py-0.5`}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <span className="text-sm capitalize text-muted-foreground">
                          {payment.method || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
