'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  Filter,
  ArrowUpRight,
  DollarSign,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { fmtCurrency, paymentStatusConfig, type PaymentStatus } from '@/lib/commerce/format';
import { StatusPill } from '@/lib/commerce/components';

interface PaymentRow {
  id: string;
  order_id: string;
  gateway_name: string;
  gateway_payment_id: string | null;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  captured_at: string | null;
  created_at: string;
  orders?: { purchaser_email: string };
}

const PAGE_SIZE = 50;

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
}

function StatCard({ icon: Icon, label, value, accent, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2', accent)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

interface PaymentsClientProps {
  payments: PaymentRow[];
  stats: {
    totalRevenueMinor: number;
    successfulOrdersCount: number;
    pendingOrdersCount: number;
    failedOrdersCount: number;
    refundedOrdersCount: number;
  };
  params: { status?: string; method?: string };
}

export function PaymentsClient({ payments, stats, params }: PaymentsClientProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState(params.method || 'all');
  const [page, setPage] = useState(1);

  const methods = useMemo(
    () => [...new Set(payments.reduce<string[]>((acc, p) => {
      if (p.method) acc.push(p.method);
      return acc;
    }, []))],
    [payments]
  );

  const captured = useMemo(() => payments.filter((p) => p.status === 'captured'), [payments]);
  const failed = useMemo(() => payments.filter((p) => p.status === 'failed'), [payments]);
  const pending = useMemo(() => payments.filter((p) => ['initiated', 'authorized'].includes(p.status)), [payments]);
  const refunded = useMemo(() => payments.filter((p) => p.status === 'refunded'), [payments]);

  const filterPayments = (list: PaymentRow[]) => {
    const base = methodFilter === 'all' ? list : list.filter((p) => p.method === methodFilter);
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.order_id.toLowerCase().includes(q) ||
        p.orders?.purchaser_email?.toLowerCase().includes(q) ||
        p.gateway_payment_id?.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <CreditCard className="size-6 text-blue-600" />
          Payment Transactions
        </h1>
        <p className="text-sm text-muted-foreground">Monitor gateway activity, capture rates, and transaction health across all sources.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={fmtCurrency(stats.totalRevenueMinor)} accent="bg-blue-500/10 text-blue-600" sub="All captured payments" />
        <StatCard icon={CheckCircle2} label="Captured" value={stats.successfulOrdersCount.toString()} accent="bg-emerald-500/10 text-emerald-600" sub="Successful payments" />
        <StatCard icon={AlertCircle} label="Failed" value={stats.failedOrdersCount.toString()} accent="bg-red-500/10 text-red-600" sub="Failed payments" />
        <StatCard icon={RotateCcw} label="Refunded" value={stats.refundedOrdersCount.toString()} accent="bg-slate-500/10 text-slate-600" sub="Refunded payments" />
      </div>

      {/* Tabs + Filters */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-muted/30 border border-border/40 p-1 rounded-xl">
            {(['all', 'captured', 'pending', 'failed', 'refunded'] as const).map((tab) => {
              const count = tab === 'all' ? payments.length
                : tab === 'captured' ? captured.length
                : tab === 'pending' ? pending.length
                : tab === 'failed' ? failed.length
                : refunded.length;
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
                >
                  {tab === 'all' ? 'All' : tab === 'pending' ? 'Pending' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className={cn(
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                    tab === 'captured' ? 'bg-emerald-500/10 text-emerald-700' :
                    tab === 'failed' ? 'bg-red-500/10 text-red-700' :
                    tab === 'pending' ? 'bg-amber-500/10 text-amber-700' :
                    tab === 'refunded' ? 'bg-slate-500/10 text-slate-700' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-9 w-full sm:w-[220px] bg-muted/20 border-border/40 rounded-lg text-sm"
              />
            </div>
            <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-[140px] bg-muted/20 border-border/40 rounded-lg text-sm">
                <Filter className="size-3.5 mr-1.5" />
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {methods.map((m) => (
                  <SelectItem key={m} value={m!}>
                    {m!.charAt(0).toUpperCase() + m!.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(['all', 'captured', 'pending', 'failed', 'refunded'] as const).map((tab) => {
          const raw = tab === 'all' ? payments
            : tab === 'captured' ? captured
            : tab === 'pending' ? pending
            : tab === 'failed' ? failed
            : refunded;
          const filtered = filterPayments(raw);
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const safePage = Math.min(page, totalPages);
          const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
          const hasPrev = safePage > 1;
          const hasNext = safePage < totalPages;

          return (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-5 pb-0">
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2', tab === 'captured' ? 'bg-emerald-500/10 text-emerald-600' : tab === 'failed' ? 'bg-red-500/10 text-red-600' : tab === 'pending' ? 'bg-amber-500/10 text-amber-600' : tab === 'refunded' ? 'bg-slate-500/10 text-slate-600' : 'bg-blue-500/10 text-blue-600')}>
                      {tab === 'captured' ? <CheckCircle2 className="size-4" /> :
                       tab === 'failed' ? <AlertCircle className="size-4" /> :
                       tab === 'pending' ? <Clock className="size-4" /> :
                       tab === 'refunded' ? <RotateCcw className="size-4" /> :
                       <CreditCard className="size-4" />}
                    </div>
                    <div>
                      <h2 className="text-base font-semibold tracking-tight">
                        {tab === 'all' ? 'All Transactions' : tab === 'pending' ? 'Pending Payments' : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Payments`}
                      </h2>
                      <p className="text-xs text-muted-foreground">{filtered.length} payment{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-0">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="size-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                        <CreditCard className="size-8 text-muted-foreground/40" />
                      </div>
                      <h3 className="text-sm font-semibold">No {tab} payments</h3>
                      <p className="text-xs text-muted-foreground mt-1">No records match the current filters.</p>
                    </div>
                  ) : (
                    <>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/10 border-b border-border/30">
                          <TableHead className="text-xs font-semibold text-muted-foreground pl-6">Payment ID</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Order</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Customer</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-muted-foreground">Amount</TableHead>
                          <TableHead className="text-center text-xs font-semibold text-muted-foreground">Method</TableHead>
                          <TableHead className="text-center text-xs font-semibold text-muted-foreground">Status</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground pr-6">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paged.map((p) => (
                          <TableRow key={p.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                            <TableCell className="py-3 pl-6">
                              <span className="font-mono text-xs font-semibold">{p.id.slice(0, 12)}...</span>
                              {p.gateway_payment_id && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5">{p.gateway_payment_id.slice(0, 14)}...</p>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <Link href={`/commerce/orders/${p.order_id}`} className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-primary hover:underline">
                                {p.order_id.slice(0, 8)}... <ArrowUpRight className="size-3" />
                              </Link>
                            </TableCell>
                            <TableCell className="py-3 text-sm font-medium">{p.orders?.purchaser_email ?? '-'}</TableCell>
                            <TableCell className="py-3 text-right font-bold text-sm tabular-nums">{fmtCurrency(p.amount_minor, p.currency)}</TableCell>
                            <TableCell className="py-3 text-center">
                              <Badge variant="outline" className="text-xs font-medium rounded-full capitalize">{p.method || '-'}</Badge>
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <StatusPill label={paymentStatusConfig[p.status].label} className={paymentStatusConfig[p.status].className} />
                            </TableCell>
                            <TableCell className="py-3 pr-6 text-xs text-muted-foreground">{fmtDate(p.captured_at ?? p.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-border/30 px-6 py-3">
                        <span className="text-xs text-muted-foreground">
                          Page {safePage} of {totalPages} ({filtered.length} total)
                        </span>
                        <Pagination className="mx-0 w-auto">
                          <PaginationContent>
                            <PaginationItem>
                              {hasPrev ? (
                                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(safePage - 1); }} />
                              ) : (
                                <PaginationPrevious href="#" className="pointer-events-none opacity-50" />
                              )}
                            </PaginationItem>
                            {getPageRange(safePage, totalPages).map((p) =>
                              p === 'ellipsis' ? (
                                <PaginationItem key="ellipsis">
                                  <PaginationEllipsis />
                                </PaginationItem>
                              ) : (
                                <PaginationItem key={p}>
                                  <PaginationLink
                                    href="#"
                                    isActive={p === safePage}
                                    onClick={(e) => { e.preventDefault(); setPage(p); }}
                                  >
                                    {p}
                                  </PaginationLink>
                                </PaginationItem>
                              ),
                            )}
                            <PaginationItem>
                              {hasNext ? (
                                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(safePage + 1); }} />
                              ) : (
                                <PaginationNext href="#" className="pointer-events-none opacity-50" />
                              )}
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
