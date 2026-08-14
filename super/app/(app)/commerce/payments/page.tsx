import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentDashboardStats } from '@/lib/services/payment-dashboard';
import { PaymentsClient } from './payments-client';

type PaymentStatus = 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded';

interface PaymentRow {
  id: string;
  order_id: string;
  gateway_name: string;
  gateway_payment_id: string | null;
  gateway_order_id: string | null;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  captured_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  orders?: {
    purchaser_email: string;
    status: string;
  };
}

async function fetchPayments(filters: { status?: string; method?: string }) {
  const admin = createAdminClient();
  let query = admin
    .from('payments')
    .select('id, order_id, gateway_name, gateway_payment_id, gateway_order_id, amount_minor, currency, status, method, captured_at, failed_at, failure_reason, created_at, orders!inner(purchaser_email, status)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.method && filters.method !== 'all') {
    query = query.eq('method', filters.method);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[payments] fetchPayments', error);
    return [];
  }
  return (data ?? []) as unknown as PaymentRow[];
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; method?: string }>;
}): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const params = await searchParams;
  const [payments, stats] = await Promise.all([
    fetchPayments(params),
    getPaymentDashboardStats(),
  ]);

  return <PaymentsClient payments={payments} stats={stats} params={params} />;
}