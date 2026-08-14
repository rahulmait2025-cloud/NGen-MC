import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { OrdersClient } from './orders-client';
import { listPaymentOrders, getPaymentDashboardStats } from '@/lib/services/payment-dashboard';
import type { OrderStatus, PurchaseSource } from '@/types/database';

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted/20 animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function OrdersContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; from?: string; to?: string; search?: string }>;
}) {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const params = await searchParams;
  
  const [orders, stats] = await Promise.all([
    listPaymentOrders({
      status: (params.status as OrderStatus) || 'paid',
      source: params.source as PurchaseSource,
      fromDate: params.from,
      toDate: params.to,
      search: params.search,
    }),
    getPaymentDashboardStats()
  ]);

  return (
    <div className="max-w-[1600px] mx-auto pb-12">
      <OrdersClient orders={orders as Parameters<typeof OrdersClient>[0]['orders']} stats={stats} />
    </div>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; from?: string; to?: string; search?: string }>;
}): Promise<ReactNode> {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}