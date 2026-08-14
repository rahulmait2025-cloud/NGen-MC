'use client';

import { useRef, useReducer, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  GraduationCap,
  Search,
  Filter,
  ShoppingBag,
  ExternalLink,
  CreditCard,
  CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { cancelOrderAction, revokeOrderAccessAction } from './actions';
import { OrderDetailsContent } from './order-details-content';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
type PurchaseSource = 'lms' | 'college_admin';

interface OrderRow {
  id: string;
  entity_type: string;
  entity_id: string;
  purchaser_email: string;
  purchaser_name: string | null;
  source: PurchaseSource;
  total_amount_minor: number;
  currency: string;
  status: OrderStatus;
  gateway_name: string;
  created_at: string;
  paid_at: string | null;
  entity_title?: string;
  master_course_title?: string;
  pillar_title?: string;
  metadata?: Record<string, unknown> | null;
}

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400' },
  refunded: { label: 'Refunded', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' },
};

const ORDERS_FMT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const ORDERS_FMT_OTHER = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function fmt(amountMinor: number, currency = 'INR') {
  if (currency === 'INR') return ORDERS_FMT.format(amountMinor / 100);
  return ORDERS_FMT_OTHER.format(amountMinor / 100);
}
function fmtDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
}

function StatusPill({ status, isRevoked }: { status: OrderStatus; isRevoked?: boolean }) {
  if (isRevoked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400">
        Revoked
      </span>
    );
  }
  const m = statusMeta[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', m.className)}>
      {m.label}
    </span>
  );
}

function StatsCard({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2', accent)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DatePicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button"
          className={cn(
            'flex h-9 w-[140px] items-center justify-start rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 size-3.5" />
          {date ? format(date, 'MMM d, yyyy') : <span>{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(day) => {
            onChange(day ? format(day, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface OrdersClientProps {
  orders: OrderRow[];
  stats: {
    totalRevenueMinor: number;
    successfulOrdersCount: number;
    pendingOrdersCount: number;
    failedOrdersCount: number;
    refundedOrdersCount: number;
    totalB2CEntitlements: number;
  };
}

type OrdersState = {
  sheetId: string | null;
  actionTarget: { action: 'cancel' | 'revoke'; orderId: string } | null;
  statusFilter: string;
  sourceFilter: string;
  typeFilter: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

function ordersReducer(state: OrdersState, action: { type: string; payload: unknown }): OrdersState {
  return { ...state, [action.type]: action.payload };
}

function OrdersTableCard({
  filtered,
  totalOrders,
  search,
  statusFilter,
  sourceFilter,
  typeFilter,
  dateFrom,
  dateTo,
  onDispatch,
}: {
  filtered: OrderRow[];
  totalOrders: number;
  search: string;
  statusFilter: string;
  sourceFilter: string;
  typeFilter: string;
  dateFrom: string;
  dateTo: string;
  onDispatch: (action: { type: string; payload: unknown }) => void;
}) {
  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">All Orders</h2>
              <p className="text-xs text-muted-foreground">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="size-3.5 text-blue-500" />
            <span>Razorpay</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 pb-4 border-b border-border/30">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by order, email, course..."
              value={search}
              onChange={(e) => onDispatch({ type: 'search', payload: e.target.value })}
              className="pl-9 h-9 bg-muted/20 border-border/40 rounded-lg text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => onDispatch({ type: 'statusFilter', payload: v })}>
            <SelectTrigger className="h-9 w-[130px] bg-muted/20 border-border/40 rounded-lg text-sm">
              <Filter className="size-3.5 mr-1.5" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => onDispatch({ type: 'sourceFilter', payload: v })}>
            <SelectTrigger className="h-9 w-[110px] bg-muted/20 border-border/40 rounded-lg text-sm">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Source</SelectItem>
              <SelectItem value="lms">LMS</SelectItem>
              <SelectItem value="college_admin">College</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => onDispatch({ type: 'typeFilter', payload: v })}>
            <SelectTrigger className="h-9 w-[120px] bg-muted/20 border-border/40 rounded-lg text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Type</SelectItem>
              <SelectItem value="master_course">Course</SelectItem>
              <SelectItem value="course_bundle">Bundle</SelectItem>
              <SelectItem value="course_variant">Variant</SelectItem>
              <SelectItem value="note_collection">Note Collection</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <DatePicker
              value={dateFrom}
              onChange={(v) => onDispatch({ type: 'dateFrom', payload: v })}
              placeholder="From"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <DatePicker
              value={dateTo}
              onChange={(v) => onDispatch({ type: 'dateTo', payload: v })}
              placeholder="To"
            />
          </div>
          {(statusFilter !== 'all' || sourceFilter !== 'all' || typeFilter !== 'all' || search || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDispatch({ type: 'statusFilter', payload: 'all' });
                onDispatch({ type: 'sourceFilter', payload: 'all' });
                onDispatch({ type: 'typeFilter', payload: 'all' });
                onDispatch({ type: 'search', payload: '' });
                onDispatch({ type: 'dateFrom', payload: '' });
                onDispatch({ type: 'dateTo', payload: '' });
              }}
              className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
              <Search className="size-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-sm font-semibold">No orders found</h3>
            <p className="text-xs text-muted-foreground mt-1">Adjust your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/10 border-b border-border/30">
                    <TableHead className="text-xs font-semibold text-muted-foreground pl-6">Order</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Content</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Customer</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground">Source</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRow
                      key={order.id}
                      className="group border-b border-border/20 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onDispatch({ type: 'sheetId', payload: order.id })}
                    >
                      <TableCell className="py-3 pl-6">
                        <span className="font-mono text-xs font-semibold text-primary group-hover:underline">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-medium truncate max-w-[160px]" title={order.master_course_title || order.entity_title || 'Unknown'}>
                          {order.master_course_title || order.entity_title || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{order.entity_type.replace('_', ' ')}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-medium truncate max-w-[180px]">{order.purchaser_email}</p>
                        {order.purchaser_name && <p className="text-xs text-muted-foreground truncate">{order.purchaser_name}</p>}
                      </TableCell>
                      <TableCell className="py-3 text-right font-bold text-sm tabular-nums">{fmt(order.total_amount_minor, order.currency)}</TableCell>
                      <TableCell className="py-3 text-center"><StatusPill status={order.status} isRevoked={!!order.metadata?.revoked} /></TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge variant="outline" className="rounded-full text-xs font-medium">
                          {order.source === 'lms' ? 'LMS' : 'College'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">{fmtDate(order.created_at)}</TableCell>
                      <TableCell className="py-3 pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 hover:bg-muted/20"
                            onClick={() => onDispatch({ type: 'sheetId', payload: order.id })}
                            title="View details"
                            aria-label={`View details for order ${order.id.slice(0, 8).toUpperCase()}`}
                          >
                            <ExternalLink className="size-3.5" />
                          </Button>
                          {order.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
                                onClick={() => onDispatch({ type: 'actionTarget', payload: { action: 'cancel', orderId: order.id } })}
                                aria-label={`Cancel order ${order.id.slice(0, 8).toUpperCase()}`}
                              >
                              Cancel
                            </Button>
                          )}
                          {order.status === 'paid' && (
                            !!order.metadata?.revoked ? (
                              <span className="text-xs text-muted-foreground italic px-2">
                                Revoked
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs font-medium text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-500/10"
                                onClick={() => onDispatch({ type: 'actionTarget', payload: { action: 'revoke', orderId: order.id } })}
                                aria-label={`Revoke access for order ${order.id.slice(0, 8).toUpperCase()}`}
                              >
                                Revoke
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-6 py-2.5 border-t border-border/20 bg-muted/5">
              <span className="text-xs text-muted-foreground">
                {filtered.length} of {totalOrders} orders
              </span>
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Razorpay</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrdersClient({ orders, stats }: OrdersClientProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(ordersReducer, {
    sheetId: null,
    actionTarget: null,
    statusFilter: 'all',
    sourceFilter: 'all',
    typeFilter: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const { sheetId, actionTarget, statusFilter, sourceFilter, typeFilter, search, dateFrom, dateTo } = state;
  const cancellingId = useRef<string | null>(null);

  const filtered = useMemo(() => {
    const parsedDateFrom = dateFrom ? new Date(dateFrom) : null;
    const parsedDateTo = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && o.source !== sourceFilter) return false;
      if (typeFilter !== 'all' && o.entity_type !== typeFilter) return false;
      if (parsedDateFrom && new Date(o.created_at) < parsedDateFrom) return false;
      if (parsedDateTo && new Date(o.created_at) > parsedDateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        return o.id.toLowerCase().includes(q) || o.purchaser_email.toLowerCase().includes(q) || (o.entity_title || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [orders, statusFilter, sourceFilter, typeFilter, search, dateFrom, dateTo]);

  const handleCancel = useCallback(() => {
    if (!actionTarget || actionTarget.action !== 'cancel') return;
    const orderId = actionTarget.orderId;
    dispatch({ type: 'actionTarget', payload: null });
    cancellingId.current = (orderId);
    cancelOrderAction(orderId).then((r) => {
      if (r.success) {
        toast.success('Order cancelled successfully');
        router.refresh();
      } else {
        toast.error(r.error || 'Failed to cancel order');
      }
      cancellingId.current = (null);
    });
  }, [actionTarget, router]);

  const handleRevoke = useCallback(() => {
    if (!actionTarget || actionTarget.action !== 'revoke') return;
    const orderId = actionTarget.orderId;
    dispatch({ type: 'actionTarget', payload: null });
    cancellingId.current = (orderId);
    revokeOrderAccessAction(orderId).then((r) => {
      if (r.success) {
        toast.success('Access revoked successfully');
        router.refresh();
      } else {
        toast.error(r.error || 'Failed to revoke access');
      }
      cancellingId.current = (null);
    });
  }, [actionTarget, router]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <ShoppingBag className="size-6 text-orange-600" />
          Orders
        </h1>
        <p className="text-sm text-muted-foreground">Manage, filter, and analyze all commerce orders.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard icon={TrendingUp} label="Net Revenue" value={fmt(stats.totalRevenueMinor)} accent="bg-orange-500/10 text-orange-600" />
        <StatsCard icon={CheckCircle2} label="Successful" value={stats.successfulOrdersCount.toString()} accent="bg-emerald-500/10 text-emerald-600" />
        <StatsCard icon={Clock} label="Pending" value={stats.pendingOrdersCount.toString()} accent="bg-amber-500/10 text-amber-600" />
        <StatsCard icon={AlertCircle} label="Failed" value={stats.failedOrdersCount.toString()} accent="bg-red-500/10 text-red-600" />
        <StatsCard icon={RotateCcw} label="Refunded" value={stats.refundedOrdersCount.toString()} accent="bg-blue-500/10 text-blue-600" />
        <StatsCard icon={GraduationCap} label="Enrollments" value={stats.totalB2CEntitlements.toString()} accent="bg-violet-500/10 text-violet-600" />
      </div>

      {/* Orders Table Card */}
      <OrdersTableCard
        filtered={filtered}
        totalOrders={orders.length}
        search={search}
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
        typeFilter={typeFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDispatch={dispatch}
      />

      {/* Cancel Dialog */}
      <AlertDialog open={!!actionTarget && actionTarget.action === 'cancel'} onOpenChange={(o) => !o && dispatch({ type: 'actionTarget', payload: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-bold">Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              The order will be marked as cancelled and the student cannot complete this purchase. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-medium">Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700 font-medium">
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Dialog */}
      <AlertDialog open={!!actionTarget && actionTarget.action === 'revoke'} onOpenChange={(o) => !o && dispatch({ type: 'actionTarget', payload: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 font-bold">Revoke Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately remove the student&apos;s access to all purchased content. This action is logged and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-medium">Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-amber-600 hover:bg-amber-700 font-medium">
              Confirm Revocation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!sheetId} onOpenChange={(o) => !o && dispatch({ type: 'sheetId', payload: null })}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader className="border-b border-border/40 pb-4 mb-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ShoppingBag className="size-5 text-orange-600 animate-pulse" />
              Order Details
            </DialogTitle>
          </DialogHeader>
          {sheetId && (
            <div className="py-2">
              <OrderDetailsContent orderId={sheetId} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
