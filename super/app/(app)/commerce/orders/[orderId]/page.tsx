import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CreditCard,
  User,
  Package,
  ShieldCheck,
  ExternalLink,
  History,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getOrderDetails } from '@/lib/services/payment-dashboard';
import type { OrderStatus, PaymentStatus } from '@/types/database';
import { RevokeAccessButton } from './revoke-access-button';

const ORDER_CURRENCY_FMT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
const ORDER_CURRENCY_FMT_OTHER = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function formatCurrency(amountMinor: number, currency: string = 'INR') {
  if (currency === 'INR') return ORDER_CURRENCY_FMT.format(amountMinor / 100);
  return ORDER_CURRENCY_FMT_OTHER.format(amountMinor / 100);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm:ss');
}

function statusBadge(status: OrderStatus, isRevoked?: boolean) {
  if (isRevoked) {
    return <Badge className="bg-red-500/10 text-red-700 border-red-500/30 border">Revoked</Badge>;
  }
  switch (status) {
    case 'paid':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border">Paid</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border">Pending</Badge>;
    case 'failed':
      return <Badge className="bg-red-500/10 text-red-700 border-red-500/30 border">Failed</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-500/10 text-gray-700 border-gray-500/30 border">Cancelled</Badge>;
    case 'refunded':
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30 border">Refunded</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function paymentStatusBadge(status: PaymentStatus) {
  switch (status) {
    case 'captured':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border text-[10px] font-semibold uppercase">Captured</Badge>;
    case 'authorized':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border text-[10px] font-semibold uppercase">Authorized</Badge>;
    case 'initiated':
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30 border text-[10px] font-semibold uppercase">Initiated</Badge>;
    case 'failed':
      return <Badge className="bg-red-500/10 text-red-700 border-red-500/30 border text-[10px] font-semibold uppercase">Failed</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px] font-semibold uppercase">{status}</Badge>;
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<ReactNode> {
  const { orderId } = await params;
  const [_auth, details] = await Promise.all([
    getSessionFromHeaders(),
    getOrderDetails(orderId),
  ]);
  if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  if (!details) {
    notFound();
  }

  const { order, studentInfo, entitlements } = details;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Order Details</h1>
            {statusBadge(order.status, !!(order.metadata as Record<string, unknown>)?.revoked)}
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-mono uppercase tracking-wider">
            ID: {order.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'paid' && !(order.metadata as Record<string, unknown>)?.revoked && (
            <RevokeAccessButton orderId={order.id} />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Order Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Order Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    {statusBadge(order.status, !!(order.metadata as Record<string, unknown>)?.revoked)}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Source</p>
                    <Badge variant="outline" className="text-xs uppercase font-semibold">{order.source}</Badge>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Created At</p>
                    <p className="text-sm font-medium">{formatDate(order.created_at)}</p>
                  </div>
                  {order.paid_at && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Paid At</p>
                      <p className="text-sm font-medium text-emerald-600">{formatDate(order.paid_at)}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-muted-foreground/10">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">Payment Details</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Base Amount:</span>
                        <span>{formatCurrency(order.base_amount_minor, order.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="text-emerald-600">-{formatCurrency(order.discount_amount_minor, order.currency)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between items-center text-base font-semibold">
                        <span>Total Paid:</span>
                        <span>{formatCurrency(order.total_amount_minor, order.currency)}</span>
                      </div>
                    </div>
                  </div>
                  {order.coupon_code && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded text-emerald-700 text-xs font-semibold justify-center uppercase tracking-widest">
                      Coupon Applied: {order.coupon_code}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Line Items</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <TableHead className="text-[10px] font-semibold uppercase">Item Type</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase">Entity ID</TableHead>
                    <TableHead className="text-right text-[10px] font-semibold uppercase">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.order_items || []).map((item: { id: string; entity_type: string; entity_id: string; total_amount_minor: number; currency: string }) => (
                    <TableRow key={item.id} className="border-b border-muted/50">
                      <TableCell className="text-sm font-medium capitalize">{item.entity_type.replace('_', ' ')}</TableCell>
                      <TableCell className="font-mono text-[10px]">{item.entity_id}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total_amount_minor, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Gateway Payments */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Gateway Transactions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(!order.payments || order.payments.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No payment records found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead className="text-[10px] font-semibold uppercase">Gateway</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase">Payment ID</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase text-center">Status</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold uppercase">Amount</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase">Method</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order.payments || []).map((payment: { id: string; gateway_name: string; gateway_payment_id: string | null; status: PaymentStatus; amount_minor: number; currency: string; method: string | null; created_at: string }) => (
                      <TableRow key={payment.id} className="border-b border-muted/50">
                        <TableCell className="text-xs font-semibold uppercase text-muted-foreground">{payment.gateway_name}</TableCell>
                        <TableCell className="font-mono text-[10px]">{payment.gateway_payment_id || '—'}</TableCell>
                        <TableCell className="text-center">{paymentStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(payment.amount_minor, payment.currency)}</TableCell>
                        <TableCell className="text-xs capitalize">{payment.method || '—'}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{formatDate(payment.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Purchaser Info */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Purchaser</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{order.purchaser_email}</p>
                  <Link href={`/users?search=${order.purchaser_email}`} className="text-primary hover:text-primary/80">
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                <p className="text-sm font-medium">{order.purchaser_name || '—'}</p>
              </div>
              {studentInfo && (
                <div className="pt-2">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-tighter">Direct Learner</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entitlement Status */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Entitlements</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {entitlements.length === 0 ? (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded text-amber-700 text-xs italic">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>No active entitlements found for this order. This may happen if the payment failed or was not yet verified.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {(entitlements || []).map((ent: { id: string; master_course_id: string; status?: string }) => {
                    const isEntRevoked = ent.status === 'revoked' || !!(order.metadata as Record<string, unknown>)?.revoked;
                    return (
                    <div key={ent.id} className={cn("p-3 border rounded", isEntRevoked ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100")}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={isEntRevoked ? "bg-red-600 text-white text-[9px] uppercase font-semibold" : "bg-emerald-600 text-white text-[9px] uppercase font-semibold"}>
                          {isEntRevoked ? "Revoked" : "Active"}
                        </Badge>
                        <span className="text-[9px] font-mono text-muted-foreground">{ent.id.slice(0, 8)}...</span>
                      </div>
                      <p className={cn("text-[11px] font-semibold uppercase tracking-tight truncate", isEntRevoked ? "text-red-800" : "text-emerald-800")}>
                         Course ID: {ent.master_course_id.slice(0, 12)}...
                      </p>
                      <div className={cn("flex items-center gap-1 mt-1 text-[9px] uppercase font-semibold", isEntRevoked ? "text-red-600" : "text-emerald-600")}>
                        {isEntRevoked ? <AlertCircle className="size-3" /> : <CheckCircle2 className="size-3" />}
                        <span>{isEntRevoked ? "Access Revoked" : "Access Granted"}</span>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Metadata */}
          <Card className="bg-muted/10">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center gap-2">
                <History className="size-4 text-muted-foreground" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Technical Info</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Gateway Order ID</p>
                <p className="font-mono text-[10px] break-all">{order.gateway_order_id || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Gateway Payment ID</p>
                <p className="font-mono text-[10px] break-all">{order.gateway_payment_id || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Idempotency Key</p>
                <p className="font-mono text-[10px] break-all">{order.idempotency_key || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Last Updated</p>
                <p className="text-[10px]">{formatDate(order.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
