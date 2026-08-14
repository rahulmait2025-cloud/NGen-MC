'use client';

import React, { useMemo, useReducer } from 'react';
import Link from 'next/link';
import { LazyMotion, domAnimation, m } from 'framer-motion';

const MotionDiv = m.div;
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Filter,
  GraduationCap,
  LayoutDashboard,
  LineChartIcon,
  Package2,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from '@/lib/recharts-client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { fmtCurrency as fmt, fmtCompact, fmtDate, srcLabel, entityLabel, type OrderStatus, type PurchaseSource } from '@/lib/commerce/format';

export type RevenuePeriod = '7d' | '30d' | '90d' | 'all';

interface OrderRow {
  id: string;
  entity_type: string;
  entity_id: string;
  purchaser_email: string;
  purchaser_name: string | null;
  source: PurchaseSource;
  base_amount_minor: number;
  discount_amount_minor: number;
  total_amount_minor: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  gateway_name?: string;
  entity_title?: string;
  master_course_title?: string;
  pillar_title?: string;
}

interface PaymentMethodBreakdownItem {
  method: string;
  count: number;
  revenueMinor: number;
}

interface RevenueByCollegeItem {
  collegeId: string;
  collegeName: string;
  revenueMinor: number;
  orderCount: number;
}

export interface RevenueDashboardMetrics {
  period: RevenuePeriod;
  periodLabel: string;
  currency: string;
  totalOrders: number;
  paidOrders: number;
  refundedOrders: number;
  grossRevenue: number;
  netRevenue: number;
  refundedRevenue: number;
  pendingRevenue: number;
  totalDiscount: number;
  thisMonthPaidRevenue: number;
  averageOrderValue: number;
  successRate: number;
  refundRate: number;
  repeatCustomerRate: number;
  repeatCustomerCount: number;
  totalCustomers: number;
  monthlyGrowthRate: number | null;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  statusBreakdown: Array<{ status: string; count: number; amount: number }>;
  sourceBreakdown: Array<{ source: string; count: number; revenue: number }>;
  entityBreakdown: Array<{ entityType: string; count: number; revenue: number }>;
  revenueTrend: Array<{
    label: string;
    grossRevenue: number;
    successfulPayment: number;
    netRevenue: number;
    refundedRevenue: number;
    paidOrders: number;
  }>;
  orderVolumeTrend: Array<{ label: string; total: number; paid: number; failed: number; pending: number; refunded: number }>;
  avgOrderValueTrend: Array<{ label: string; avgOrderValue: number }>;
  gatewayBreakdown: Array<{ gateway: string; count: number; revenue: number }>;
  topCourses: Array<{ title: string; entityId: string; entityType: string; source: string; count: number; revenue: number }>;
  recentOrders: OrderRow[];
  paymentMethodBreakdown: PaymentMethodBreakdownItem[];
  revenueByCollege: RevenueByCollegeItem[];
}

const PERIOD_OPTIONS: Array<{ value: RevenuePeriod; label: string }> = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
];

const statusColor: Record<string, string> = {
  paid: 'oklch(0.65 0.18 150)',
  pending: 'oklch(0.75 0.16 80)',
  refunded: 'oklch(0.72 0.18 25)',
  failed: 'oklch(0.62 0.22 25)',
  cancelled: 'oklch(0.6 0.02 260)',
};

const entityColors = ['oklch(0.72 0.17 150)', 'oklch(0.67 0.19 45)', 'oklch(0.62 0.17 260)', 'oklch(0.65 0.2 320)'];

function periodTrendPercent(values: number[]): number | null {
  if (values.length < 2) return null;
  const mid = Math.max(1, Math.floor(values.length / 2));
  const first = values.slice(0, mid).reduce((sum, value) => sum + value, 0);
  const second = values.slice(mid).reduce((sum, value) => sum + value, 0);
  if (first === 0) return second > 0 ? 100 : 0;
  return ((second - first) / first) * 100;
}

function ChartTrendFooter({
  headline,
  subline,
  trendPercent,
}: {
  headline: string;
  subline: string;
  trendPercent?: number | null;
}) {
  const up = trendPercent === undefined || trendPercent === null ? true : trendPercent >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;

  return (
    <CardFooter className="flex-col items-start gap-1.5 border-t border-border/40 bg-muted/5 pt-4 text-sm">
      <div className="flex w-full items-start gap-2">
        <div className="grid gap-2">
          <div className="flex items-center gap-2 leading-none font-medium">
            {headline}
            {trendPercent !== undefined && trendPercent !== null ? (
              <TrendIcon className="h-4 w-4 shrink-0" />
            ) : null}
          </div>
          <div className="leading-none text-muted-foreground">{subline}</div>
        </div>
      </div>
    </CardFooter>
  );
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <Badge variant="outline" className={cn('inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-px tabular-nums', up ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20')}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? '+' : ''}{value}%
    </Badge>
  );
}

const REVENUE_STATUS_MAP: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  failed: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  refunded: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  cancelled: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const revenueTrendConfig = {
  successfulPayment: { label: 'Successful payments', color: '#f97316' },
} satisfies ChartConfig;

function StatusPill({ status }: { status: string }) {
  return <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium border capitalize', REVENUE_STATUS_MAP[status] ?? '')}>{status}</Badge>;
}

function MetricCard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>;
  accent: string; trend?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2 shrink-0', accent)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xl font-bold tabular-nums tracking-tight truncate">{value}</p>
            {trend !== undefined && trend !== null && <TrendBadge value={trend} />}
          </div>
          {sub && <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

type OrderFilterState = {
  statusFilter: string;
  sourceFilter: string;
  typeFilter: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

type OrderFilterAction =
  | { type: 'SET_STATUS'; value: string }
  | { type: 'SET_SOURCE'; value: string }
  | { type: 'SET_TYPE'; value: string }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_DATE_FROM'; value: string }
  | { type: 'SET_DATE_TO'; value: string }
  | { type: 'CLEAR_ALL' };

function orderFilterReducer(state: OrderFilterState, action: OrderFilterAction): OrderFilterState {
  switch (action.type) {
    case 'SET_STATUS': return { ...state, statusFilter: action.value };
    case 'SET_SOURCE': return { ...state, sourceFilter: action.value };
    case 'SET_TYPE': return { ...state, typeFilter: action.value };
    case 'SET_SEARCH': return { ...state, search: action.value };
    case 'SET_DATE_FROM': return { ...state, dateFrom: action.value };
    case 'SET_DATE_TO': return { ...state, dateTo: action.value };
    case 'CLEAR_ALL': return { statusFilter: 'all', sourceFilter: 'all', typeFilter: 'all', search: '', dateFrom: '', dateTo: '' };
  }
}

function RecentTransactionsSection({
  filteredOrders,
  totalCount,
  search,
  statusFilter,
  sourceFilter,
  typeFilter,
  dateFrom,
  dateTo,
  dispatchFilter,
  currency: _currency,
}: {
  filteredOrders: OrderRow[];
  totalCount: number;
  search: string;
  statusFilter: string;
  sourceFilter: string;
  typeFilter: string;
  dateFrom: string;
  dateTo: string;
  dispatchFilter: React.Dispatch<OrderFilterAction>;
  currency: string;
}) {
  const hasFilters = statusFilter !== 'all' || sourceFilter !== 'all' || typeFilter !== 'all' || search || dateFrom || dateTo;
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 p-1.5"><ShoppingCart className="size-3.5 text-orange-600" /></div>
            <div><CardTitle className="text-base font-semibold tracking-tight">Recent Transactions</CardTitle><CardDescription className="text-xs">{filteredOrders.length} of {totalCount} orders</CardDescription></div>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs font-semibold"><Link href="/commerce/orders">All orders <ArrowRight className="size-3 ml-1" /></Link></Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/30">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input placeholder="Search order, email, customer..." value={search} onChange={(e) => dispatchFilter({ type: 'SET_SEARCH', value: e.target.value })} className="pl-9 h-8 text-xs bg-muted/20 border-border/40" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => dispatchFilter({ type: 'SET_STATUS', value: v })}>
            <SelectTrigger className="h-8 w-[130px] bg-muted/20 border-border/40 text-xs"><Filter className="size-3 mr-1.5" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => dispatchFilter({ type: 'SET_SOURCE', value: v })}>
            <SelectTrigger className="h-8 w-[110px] bg-muted/20 border-border/40 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Source</SelectItem><SelectItem value="lms">LMS</SelectItem><SelectItem value="college_admin">College</SelectItem></SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => dispatchFilter({ type: 'SET_TYPE', value: v })}>
            <SelectTrigger className="h-8 w-[120px] bg-muted/20 border-border/40 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Type</SelectItem><SelectItem value="master_course">Course</SelectItem><SelectItem value="course_bundle">Bundle</SelectItem><SelectItem value="course_variant">Variant</SelectItem></SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <DatePicker value={dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined} onChange={(date) => dispatchFilter({ type: 'SET_DATE_FROM', value: date ? date.toISOString().split('T')[0] : '' })} placeholder="From" className="h-8 w-[140px] text-xs" />
            <span className="text-xs text-muted-foreground">to</span>
            <DatePicker value={dateTo ? new Date(dateTo + 'T00:00:00') : undefined} onChange={(date) => dispatchFilter({ type: 'SET_DATE_TO', value: date ? date.toISOString().split('T')[0] : '' })} placeholder="To" className="h-8 w-[140px] text-xs" />
          </div>
          {hasFilters && (<Button variant="ghost" size="sm" onClick={() => dispatchFilter({ type: 'CLEAR_ALL' })} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">Clear</Button>)}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-xl bg-muted/30 flex items-center justify-center mb-4"><Search className="size-8 text-muted-foreground/40" /></div>
            <h3 className="text-sm font-semibold">No orders found</h3>
            <p className="text-xs text-muted-foreground mt-1">Adjust your filters or search query.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/10 border-b border-border/30">
                <TableHead className="text-xs font-semibold text-muted-foreground pl-6">Order</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Customer</TableHead>
                <TableHead className="text-center text-xs font-semibold text-muted-foreground">Source</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Type</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                  <TableCell className="py-3 pl-6">
                    <Link href={`/commerce/orders/${order.id}`} className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-orange-600 hover:text-orange-700">#{order.id.slice(0, 8).toUpperCase()} <ArrowRight className="size-3" /></Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(order.created_at)}</p>
                  </TableCell>
                  <TableCell className="py-3"><StatusPill status={order.status} /></TableCell>
                  <TableCell className="py-3"><p className="text-sm font-medium">{order.purchaser_name || '—'}</p><p className="text-xs text-muted-foreground">{order.purchaser_email}</p></TableCell>
                  <TableCell className="py-3 text-center">
                    <Badge variant="outline" className="rounded-full text-xs font-medium">
                      {order.source === 'lms' ? (<span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-primary" />LMS</span>) : (<span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-amber-500" />College</span>)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium">{entityLabel(order.entity_type)}</TableCell>
                  <TableCell className="py-3 pr-6 text-right font-mono text-sm font-bold tabular-nums">{fmt(order.total_amount_minor, order.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueDashboard({ metrics }: { metrics: RevenueDashboardMetrics }) {
  const [filters, dispatchFilter] = useReducer(orderFilterReducer, {
    statusFilter: 'all',
    sourceFilter: 'all',
    typeFilter: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
  } as OrderFilterState);
  const { statusFilter, sourceFilter, typeFilter, search, dateFrom, dateTo } = filters;

  const filteredOrders = React.useMemo(() => {
    return metrics.recentOrders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && order.source !== sourceFilter) return false;
      if (typeFilter !== 'all' && order.entity_type !== typeFilter) return false;
      if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(order.created_at) > new Date(dateTo + 'T23:59:59')) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !order.id.toLowerCase().includes(q) &&
          !order.purchaser_email?.toLowerCase().includes(q) &&
          !(order.purchaser_name ?? '').toLowerCase().includes(q) &&
          !(order.entity_title ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [metrics.recentOrders, statusFilter, sourceFilter, typeFilter, search, dateFrom, dateTo]);

  const { volumeConfig, aovConfig, sourceConfig } = useMemo(() => ({
    volumeConfig: {
      paid: { label: 'Paid', color: 'oklch(0.65 0.18 150)' },
      pending: { label: 'Pending', color: 'oklch(0.75 0.16 80)' },
      failed: { label: 'Failed', color: 'oklch(0.62 0.22 25)' },
      refunded: { label: 'Refunded', color: 'oklch(0.72 0.18 25)' },
    } satisfies ChartConfig,
    aovConfig: {
      avgOrderValue: { label: 'Avg Order Value', color: 'oklch(0.67 0.19 45)' },
    } satisfies ChartConfig,
    sourceConfig: {
      lms: { label: 'LMS', color: 'oklch(0.72 0.17 150)' },
      college_admin: { label: 'College', color: 'oklch(0.67 0.19 45)' },
    } satisfies ChartConfig,
  }), []);

  const { statusConfig, dominantStatus } = useMemo(() => ({
    statusConfig: metrics.statusBreakdown.reduce<ChartConfig>((acc, item) => {
      acc[item.status] = { label: item.status, color: statusColor[item.status] ?? 'oklch(0.62 0.03 250)' };
      return acc;
    }, {}),
    dominantStatus: metrics.statusBreakdown.reduce(
      (best, row) => (row.count > best.count ? row : best),
      metrics.statusBreakdown[0] ?? { status: 'paid', count: 0, amount: 0 },
    ),
  }), [metrics.statusBreakdown]);

  const { successfulPaymentTrend, totalSuccessfulPayment, successfulSeriesTrend: _successfulSeriesTrend, paymentTrendPercent, revenueTrendRange } = useMemo(() => {
    const trend = metrics.revenueTrend.filter((point) => point.successfulPayment > 0);
    const total = trend.reduce((sum, point) => sum + point.successfulPayment, 0);
    const series = periodTrendPercent(trend.map((point) => point.successfulPayment));
    const percent = metrics.monthlyGrowthRate ?? series;
    const range = trend.length > 0
      ? `${trend[0]?.label} – ${trend[trend.length - 1]?.label}`
      : metrics.periodLabel;
    return { successfulPaymentTrend: trend, totalSuccessfulPayment: total, successfulSeriesTrend: series, paymentTrendPercent: percent, revenueTrendRange: range };
  }, [metrics.revenueTrend, metrics.monthlyGrowthRate, metrics.periodLabel]);

  const { totalVolumePaid, volumeTrend } = useMemo(() => ({
    totalVolumePaid: metrics.orderVolumeTrend.reduce((sum, row) => sum + row.paid, 0),
    volumeTrend: periodTrendPercent(metrics.orderVolumeTrend.map((row) => row.paid)),
  }), [metrics.orderVolumeTrend]);

  const { aovTrend, latestAov } = useMemo(() => ({
    aovTrend: periodTrendPercent(metrics.avgOrderValueTrend.map((row) => row.avgOrderValue)),
    latestAov: metrics.avgOrderValueTrend[metrics.avgOrderValueTrend.length - 1]?.avgOrderValue,
  }), [metrics.avgOrderValueTrend]);

  const topSource = useMemo(() => metrics.sourceBreakdown.reduce(
    (best, row) => (row.revenue > best.revenue ? row : best),
    metrics.sourceBreakdown[0] ?? { source: 'lms', count: 0, revenue: 0 },
  ), [metrics.sourceBreakdown]);

  const sparseRevenueTrend = successfulPaymentTrend.length <= 3;

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-4 pb-16">
      {/* Hero Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
              <LayoutDashboard className="size-5" />
            </div>
            Revenue
          </h1>
          <p className="text-sm text-muted-foreground">
            {metrics.periodLabel} · {metrics.totalOrders.toLocaleString()} orders · {fmt(metrics.netRevenue, metrics.currency)} net
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
            <Button key={opt.value} asChild size="sm" variant={metrics.period === opt.value ? 'default' : 'outline'} className="rounded-full h-8 px-3 text-xs font-semibold">
              <Link href={`/commerce/revenue?period=${opt.value}`}>{opt.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Net Revenue', value: fmt(metrics.netRevenue, metrics.currency), sub: 'Gross minus refunds', icon: DollarSign, accent: 'bg-[oklch(0.67_0.19_45)]/10 text-[oklch(0.55_0.25_45)]' },
          { label: 'Gross Revenue', value: fmt(metrics.grossRevenue, metrics.currency), sub: 'Paid orders only', icon: DollarSign, accent: 'bg-[oklch(0.67_0.19_45)]/10 text-[oklch(0.55_0.25_45)]' },
          { label: 'Avg Order Value', value: fmt(metrics.averageOrderValue, metrics.currency), sub: 'Per transaction', icon: CreditCard, accent: 'bg-[oklch(0.65_0.18_150)]/10 text-[oklch(0.5_0.22_150)]' },
          { label: 'Monthly Growth', value: metrics.monthlyGrowthRate !== null ? `${metrics.monthlyGrowthRate >= 0 ? '+' : ''}${metrics.monthlyGrowthRate.toFixed(1)}%` : '—', sub: 'This month vs last', icon: TrendingUp, accent: 'bg-[oklch(0.65_0.18_150)]/10 text-[oklch(0.5_0.22_150)]' },
          { label: 'This Month', value: fmt(metrics.thisMonthPaidRevenue, metrics.currency), sub: `Pipeline: ${fmtCompact(metrics.pendingRevenue, metrics.currency)}`, icon: BadgeIndianRupee, accent: 'bg-[oklch(0.67_0.19_45)]/10 text-[oklch(0.55_0.25_45)]' },
          { label: 'Success Rate', value: `${metrics.successRate}%`, sub: 'Paid / total orders', icon: ShieldCheck, accent: 'bg-[oklch(0.65_0.18_150)]/10 text-[oklch(0.5_0.22_150)]' },
          { label: 'Repeat Customers', value: `${metrics.repeatCustomerRate.toFixed(1)}%`, sub: `${metrics.repeatCustomerCount} of ${metrics.totalCustomers} total`, icon: RefreshCcw, accent: 'bg-slate-500/10 text-slate-600' },
          { label: 'Refund Rate', value: `${metrics.refundRate}%`, sub: 'Refunded / paid', icon: ShoppingCart, accent: 'bg-slate-500/10 text-slate-600' },
        ].map((card, i) => (
          <MotionDiv
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04, ease: [0.25, 1, 0.5, 1] }}
          >
            <MetricCard {...card} />
          </MotionDiv>
        ))}
      </div>

      {/* Main Charts Row */}
      <MotionDiv
        className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.12, ease: [0.25, 1, 0.5, 1] }}
      >
        {/* Revenue Trend */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-orange-500/10 p-1.5">
                  <LineChartIcon className="size-3.5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Revenue Over Time</CardTitle>
                  <CardDescription className="text-xs">
                    Successful payment revenue for {metrics.periodLabel}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#f97316]" />
                  Successful payments
                </span>
                <span className="tabular-nums font-medium text-foreground">
                  {fmt(totalSuccessfulPayment, metrics.currency)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {successfulPaymentTrend.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-sm text-muted-foreground">No successful payments for this period</p>
              </div>
            ) : (
              <ChartContainer config={revenueTrendConfig} className="aspect-auto h-[160px] w-full">
                <AreaChart
                  accessibilityLayer
                  data={successfulPaymentTrend}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickMargin={4}
                    domain={[0, 'auto']}
                    tickFormatter={(value) => fmtCompact(Number(value), metrics.currency)}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(label, payload) => {
                          const row = payload?.[0]?.payload as { paidOrders?: number } | undefined;
                          const count = row?.paidOrders ?? 0;
                          return count > 0 ? `${label} · ${count} payment${count === 1 ? '' : 's'}` : String(label);
                        }}
                        formatter={(value) => (
                          <div className="flex min-w-[140px] items-center justify-between gap-3">
                            <span className="text-muted-foreground text-xs">Collected</span>
                            <span className="font-mono font-semibold text-sm tabular-nums">
                              {fmt(Number(value ?? 0), metrics.currency)}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    dataKey="successfulPayment"
                    type="natural"
                    fill="var(--color-successfulPayment)"
                    fillOpacity={0.35}
                    stroke="var(--color-successfulPayment)"
                    strokeWidth={2}
                    dot={
                      sparseRevenueTrend
                        ? { r: 5, fill: 'var(--color-successfulPayment)', strokeWidth: 0 }
                        : false
                    }
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
          {successfulPaymentTrend.length > 0 ? (
            <ChartTrendFooter
              headline={
                paymentTrendPercent !== null
                  ? `Successful payments ${paymentTrendPercent >= 0 ? 'trending up' : 'trending down'} by ${Math.abs(paymentTrendPercent).toFixed(1)}% in period`
                  : `${fmt(totalSuccessfulPayment, metrics.currency)} from ${metrics.paidOrders.toLocaleString()} successful payments`
              }
              subline={`${revenueTrendRange} · ${metrics.paidOrders.toLocaleString()} paid orders · ${fmt(metrics.netRevenue, metrics.currency)} net after refunds`}
              trendPercent={paymentTrendPercent}
            />
          ) : null}
        </Card>

        {/* Order Status Donut */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader>
<div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-500/10 p-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Order Status Mix</CardTitle>
                <CardDescription className="text-xs">Distribution across all statuses</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.statusBreakdown.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-sm text-muted-foreground">No status data</p>
              </div>
            ) : (
              <>
                <ChartContainer config={statusConfig} className="h-[140px] w-full">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(v, n) => (
                      <div className="flex min-w-[100px] items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs capitalize">{String(n)}</span>
                        <span className="font-mono font-semibold text-xs tabular-nums">{Number(v ?? 0).toLocaleString()}</span>
                      </div>
                    )} />} />
                    <Pie data={metrics.statusBreakdown} dataKey="count" nameKey="status" innerRadius={42} outerRadius={68} paddingAngle={2}>
                      {metrics.statusBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={statusColor[entry.status] ?? 'oklch(0.62 0.03 250)'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="space-y-1.5">
                  {metrics.statusBreakdown.map((entry) => (
                    <div key={entry.status} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-1.5 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: statusColor[entry.status] ?? 'oklch(0.62 0.03 250)' }} />
                        <span className="text-xs font-semibold capitalize">{entry.status}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{fmtCompact(entry.amount, metrics.currency)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
          {metrics.statusBreakdown.length > 0 ? (
            <ChartTrendFooter
              headline={`${dominantStatus.status.charAt(0).toUpperCase()}${dominantStatus.status.slice(1)} leads with ${dominantStatus.count.toLocaleString()} orders (${metrics.successRate}% paid)`}
              subline={`${metrics.totalOrders.toLocaleString()} orders in ${metrics.periodLabel}`}
            />
          ) : null}
        </Card>
      </MotionDiv>

      {/* Order Volume + AOV Row */}
      <MotionDiv
        className="grid gap-4 lg:grid-cols-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.16, ease: [0.25, 1, 0.5, 1] }}
      >
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-1.5">
                <BarChart3 className="size-3.5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Order Volume</CardTitle>
                <CardDescription className="text-xs">Daily transaction flow</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {metrics.orderVolumeTrend.length === 0 ? (
              <div className="flex h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-xs text-muted-foreground">No volume data</p>
              </div>
            ) : (
              <ChartContainer config={volumeConfig} className="h-[140px] w-full">
                <BarChart accessibilityLayer data={metrics.orderVolumeTrend} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/30" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10 }} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" formatter={(v, n) => (
                    <div className="flex min-w-[100px] items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs capitalize">{String(n)}</span>
                      <span className="font-mono font-semibold text-xs tabular-nums">{Number(v ?? 0).toLocaleString()}</span>
                    </div>
                  )} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="pending" fill="var(--color-pending)" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
          {metrics.orderVolumeTrend.length > 0 ? (
            <ChartTrendFooter
              headline={`${totalVolumePaid.toLocaleString()} paid${volumeTrend !== null ? ` · ${volumeTrend >= 0 ? 'up' : 'down'} ${Math.abs(volumeTrend).toFixed(1)}%` : ''}`}
              subline={`Volume for ${metrics.periodLabel}`}
              trendPercent={volumeTrend}
            />
          ) : null}
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-500/10 p-1.5">
                <LineChartIcon className="size-3.5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Average Order Value</CardTitle>
                <CardDescription className="text-xs">Transaction size evolution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {metrics.avgOrderValueTrend.length === 0 ? (
              <div className="flex h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-xs text-muted-foreground">No AOV data</p>
              </div>
            ) : (
              <ChartContainer config={aovConfig} className="h-[140px] w-full">
                <LineChart accessibilityLayer data={metrics.avgOrderValueTrend} margin={{ left: 0, right: 0, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/30" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={v => fmtCompact(Number(v), metrics.currency)} tick={{ fontSize: 10 }} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" formatter={(v) => (
                    <div className="flex min-w-[120px] items-center justify-between gap-3">
                      <span className="text-muted-foreground text-xs">AOV</span>
                      <span className="font-mono font-semibold text-xs tabular-nums">{fmt(Number(v ?? 0), metrics.currency)}</span>
                    </div>
                  )} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="natural" dataKey="avgOrderValue" stroke="var(--color-avgOrderValue)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-avgOrderValue)' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
          {metrics.avgOrderValueTrend.length > 0 ? (
            <ChartTrendFooter
              headline={
                latestAov !== undefined
                  ? `Latest ${fmtCompact(latestAov, metrics.currency)}${aovTrend !== null ? ` · ${aovTrend >= 0 ? 'up' : 'down'} ${Math.abs(aovTrend).toFixed(1)}%` : ''}`
                  : `Platform AOV ${fmtCompact(metrics.averageOrderValue, metrics.currency)}`
              }
              subline={`Average for ${metrics.periodLabel}`}
              trendPercent={aovTrend}
            />
          ) : null}
        </Card>
      </MotionDiv>

      {/* Source + Product Type Row */}
      <MotionDiv
        className="grid gap-4 lg:grid-cols-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.19, ease: [0.25, 1, 0.5, 1] }}
      >
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-500/10 p-1.5">
                <GraduationCap className="size-3.5 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Revenue by Source</CardTitle>
                <CardDescription className="text-xs">LMS vs College contribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {metrics.sourceBreakdown.length === 0 ? (
              <div className="flex h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-xs text-muted-foreground">No source data</p>
              </div>
            ) : (
              <ChartContainer config={sourceConfig} className="h-[140px] w-full">
                <BarChart accessibilityLayer data={metrics.sourceBreakdown} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="4 4" className="stroke-border/30" />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={v => fmtCompact(Number(v), metrics.currency)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="source" tickLine={false} axisLine={false} width={80} tickFormatter={v => srcLabel(v as PurchaseSource)} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" formatter={(v) => (
                    <div className="flex min-w-[120px] items-center justify-between gap-3">
                      <span className="text-muted-foreground text-xs">Revenue</span>
                      <span className="font-mono font-semibold text-xs">{fmt(Number(v ?? 0), metrics.currency)}</span>
                    </div>
                  )} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20}>
                    {metrics.sourceBreakdown.map((entry) => (
                      <Cell key={entry.source} fill={entry.source === 'lms' ? 'oklch(0.72 0.17 150)' : 'oklch(0.67 0.19 45)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
          {metrics.sourceBreakdown.length > 0 ? (
            <ChartTrendFooter
              headline={`${srcLabel(topSource.source as PurchaseSource)} leads with ${fmtCompact(topSource.revenue, metrics.currency)}`}
              subline={`Split for ${metrics.periodLabel}`}
            />
          ) : null}
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-500/10 p-1.5">
                <Package2 className="size-3.5 text-rose-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Product Mix</CardTitle>
                <CardDescription className="text-xs">Revenue by product type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {metrics.entityBreakdown.length === 0 ? (
              <div className="flex h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-xs text-muted-foreground">No product data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.entityBreakdown.map((entry, i) => {
                  const max = metrics.entityBreakdown[0]?.revenue ?? 1;
                  const pct = Math.round((entry.revenue / max) * 100);
                  return (
                    <div key={entry.entityType} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: entityColors[i] }} />
                          <span className="text-xs font-semibold">{entityLabel(entry.entityType)}</span>
                        </div>
                        <span className="text-sm font-bold tabular-nums">{fmtCompact(entry.revenue, metrics.currency)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                        <div className="h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out)]" style={{ width: `${pct}%`, backgroundColor: entityColors[i] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          {metrics.entityBreakdown.length > 0 ? (
            <ChartTrendFooter
              headline={`${entityLabel(metrics.entityBreakdown[0]?.entityType ?? '')} is top seller`}
              subline={`${metrics.paidOrders.toLocaleString()} total units sold`}
            />
          ) : null}
        </Card>
      </MotionDiv>

      {/* Gateway + Top Courses Row */}
      <MotionDiv
        className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.23, ease: [0.25, 1, 0.5, 1] }}
      >
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-1.5">
                <CreditCard className="size-3.5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Payment Gateways</CardTitle>
                <CardDescription className="text-xs">Revenue and volume by gateway</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {metrics.gatewayBreakdown.length === 0 ? (
              <div className="flex h-[160px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-sm text-muted-foreground">No gateway data</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.gatewayBreakdown.map((entry) => (
                  <div key={entry.gateway} className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize">{entry.gateway}</span>
                      <Badge variant="outline" className="text-xs font-semibold">{entry.count} orders</Badge>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{fmt(entry.revenue, metrics.currency)}</p>
                    <Progress value={Math.round((entry.revenue / (metrics.gatewayBreakdown[0]?.revenue ?? 1)) * 100)} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-1.5">
                  <TrendingUp className="size-3.5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Top Courses</CardTitle>
                  <CardDescription className="text-xs">Best sellers by revenue</CardDescription>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs font-semibold">
                <Link href="/commerce/orders">View all <ArrowRight className="size-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {metrics.topCourses.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-sm text-muted-foreground">No course data</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/10 border-b border-border/30">
                    <TableHead className="text-xs font-semibold text-muted-foreground pl-6 w-8">#</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Course</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground">Sales</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground pr-6">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.topCourses.map((course, i) => (
                    <TableRow key={course.entityId} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                      <TableCell className="py-2.5 pl-6 w-8">
                        <div className="size-7 rounded-lg flex items-center justify-center text-xs font-bold bg-muted/40 text-muted-foreground">
                          {i + 1}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <p className="text-sm font-semibold truncate max-w-[180px]" title={course.title}>{course.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-xs font-medium px-1.5 py-0.5">{entityLabel(course.entityType)}</Badge>
                          <Badge variant="outline" className="text-xs font-medium px-1.5 py-0.5">{srcLabel(course.source as PurchaseSource)}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <span className="text-sm font-semibold tabular-nums">{course.count.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="py-2.5 pr-6 text-right">
                        <span className="text-sm font-bold tabular-nums">{fmt(course.revenue, metrics.currency)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </MotionDiv>

      {/* Payment Methods + Revenue by College */}
      <MotionDiv
        className="grid gap-4 lg:grid-cols-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.26, ease: [0.25, 1, 0.5, 1] }}
      >
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-1.5">
                <CreditCard className="size-3.5 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Payment Methods</CardTitle>
                <CardDescription className="text-xs">Volume and revenue by payment method</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {metrics.paymentMethodBreakdown.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-sm text-muted-foreground">No payment data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.paymentMethodBreakdown.map((entry) => {
                  const maxRevenue = metrics.paymentMethodBreakdown[0]?.revenueMinor ?? 1;
                  const pct = Math.round((entry.revenueMinor / maxRevenue) * 100);
                  return (
                    <div key={entry.method} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: 'oklch(0.67 0.19 45)' }} />
                          <span className="text-sm font-semibold capitalize">{entry.method}</span>
                          <Badge variant="outline" className="text-xs font-semibold">{entry.count} txns</Badge>
                        </div>
                        <span className="text-sm font-bold tabular-nums">{fmt(entry.revenueMinor, metrics.currency)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'oklch(0.67 0.19 45)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden min-w-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-1.5">
                <GraduationCap className="size-3.5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Revenue by College</CardTitle>
                <CardDescription className="text-xs">Top performing colleges by revenue</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {metrics.revenueByCollege.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-muted/10">
                <p className="text-sm text-muted-foreground">No college data</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/10 border-b border-border/30">
                    <TableHead className="text-xs font-semibold text-muted-foreground pl-6">College</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground">Orders</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground pr-6">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.revenueByCollege.map((college) => (
                    <TableRow key={college.collegeId} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                      <TableCell className="py-3 pl-6">
                        <p className="text-sm font-semibold">{college.collegeName}</p>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-sm font-semibold tabular-nums">{college.orderCount.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right">
                        <span className="text-sm font-bold tabular-nums">{fmt(college.revenueMinor, metrics.currency)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </MotionDiv>

      {/* Recent Transactions */}
      <MotionDiv
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.3, ease: [0.25, 1, 0.5, 1] }}
      >
      <RecentTransactionsSection
        filteredOrders={filteredOrders}
        totalCount={metrics.recentOrders.length}
        search={search}
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
        typeFilter={typeFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        dispatchFilter={dispatchFilter}
        currency={metrics.currency}
      />
      </MotionDiv>
    </div>
    </LazyMotion>
  );
}
