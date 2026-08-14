import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import type { ReactNode } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Tags,
  TrendingUp,
  DollarSign,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { fmtCurrency, couponStatusConfig } from '@/lib/commerce/format';
import { StatusPill } from '@/lib/commerce/components';
import { CouponsClient } from './coupons-client';
import { CopyCodeButton } from './copy-code-button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCouponAnalytics } from '@/lib/services/coupons-analytics';
import { CouponsAnalyticsClient } from './coupons-analytics-client';

type CouponStatus = 'active' | 'expired' | 'exhausted' | 'disabled';
type SellableEntityType = 'master_course' | 'course_variant' | 'course_bundle';
type PurchaseSource = 'lms' | 'college_admin';

interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number;
  valid_from: string;
  valid_until: string | null;
  status: CouponStatus;
  applicable_entity_types: SellableEntityType[];
  applicable_entity_ids: string[] | null;
  min_order_amount_minor: number | null;
  applicable_sources: PurchaseSource[];
  created_at: string;
}

interface CouponUsageRow {
  coupon_id: string;
  discount_amount_minor: number;
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'MMM d, yyyy');
}

async function fetchAllCoupons() {
  const admin = createAdminClient();
  // Fetch only the count (head:true) plus minimal columns needed for stats.
  // The paginated fetch already retrieves the visible page rows.
  const { data, error, count } = await admin
    .from('coupons')
    .select('id, status', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch coupons: ${error.message}`);
  return { coupons: (data ?? []) as Pick<CouponRow, 'id' | 'status'>[], total: count ?? 0 };
}

async function fetchPaginatedCoupons(limit: number, offset: number) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Failed to fetch coupons: ${error.message}`);
  return (data ?? []) as CouponRow[];
}

async function fetchCouponUsages() {
  const admin = createAdminClient();
  const { data, error } = await admin.from('coupon_usages').select('coupon_id, discount_amount_minor');
  if (error) {
    const isAbort = error.message?.includes('aborted') || error.name === 'AbortError' || error.message?.includes('AbortError');
    if (!isAbort) {
      console.error('[coupons] Failed to fetch usages:', error);
    }
    return [] as CouponUsageRow[];
  }
  return (data ?? []) as CouponUsageRow[];
}

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

const PAGE_SIZE = 20;

export default async function CouponsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params?.page ?? '1', 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [allCouponsResult, pageCoupons, usages, analytics] = await Promise.all([
    fetchAllCoupons(),
    fetchPaginatedCoupons(PAGE_SIZE, offset),
    fetchCouponUsages(),
    getCouponAnalytics(),
  ]);

  const { total } = allCouponsResult;
  const allCoupons = allCouponsResult.coupons;
  const active = allCoupons.filter((c) => c.status === 'active').length;
  const exhausted = allCoupons.filter((c) => c.status === 'exhausted').length;
  const totalUses = usages.length;
  const totalDiscount = usages.reduce((sum, u) => sum + u.discount_amount_minor, 0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="space-y-6 pb-16">
      <Tabs defaultValue="manage" className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="flex items-center gap-2.5">
              <Tags className="size-6 text-primary" />
              Coupons
            </h1>
            <p className="text-sm text-muted-foreground">Discount codes across LMS and College channels</p>
          </div>
          
          <div className="flex items-center gap-3">
            <TabsList className="bg-muted/60 border border-border/40 p-1 rounded-lg h-9">
              <TabsTrigger value="manage" className="text-xs font-semibold px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                Manage
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs font-semibold px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                Analytics & History
              </TabsTrigger>
            </TabsList>
            <CouponsClient coupons={pageCoupons} stats={{ active, totalUses, totalDiscount }} mode="header-button" />
          </div>
        </div>

        <TabsContent value="manage" className="space-y-6 outline-none">
          {/* Stats Grid */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {/* Active — the single orange-accented hero card */}
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Active</p>
                  <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">{active}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{exhausted} exhausted</p>
                </div>
              </div>
            </div>

            {/* Total Uses — neutral chrome */}
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5 text-muted-foreground shrink-0">
                  <TrendingUp className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Total Uses</p>
                  <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">{totalUses.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">All redemptions</p>
                </div>
              </div>
            </div>

            {/* Discount Given — neutral chrome */}
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5 text-muted-foreground shrink-0">
                  <DollarSign className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Discount Given</p>
                  <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">{fmtCurrency(totalDiscount)}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Across all uses</p>
                </div>
              </div>
            </div>

            {/* Total — neutral chrome */}
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5 text-muted-foreground shrink-0">
                  <Tags className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Total</p>
                  <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">{total}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Coupons created</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coupons Table */}
          {pageCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-xl bg-muted/30 flex items-center justify-center mb-4">
                <Tags className="size-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-semibold">No coupons yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs">
                Create your first coupon to offer discounts to customers.
              </p>
              <CouponsClient coupons={pageCoupons} stats={{ active, totalUses, totalDiscount }} mode="empty-state" />
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <Table containerClassName="scrollbar-hide">
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30 border-b border-border/40">
                    <TableHead className="w-[30%] text-xs font-semibold text-muted-foreground pl-6">Code</TableHead>
                    <TableHead className="w-[12%] text-xs font-semibold text-muted-foreground">Discount</TableHead>
                    <TableHead className="w-[10%] text-xs font-semibold text-muted-foreground">Usage</TableHead>
                    <TableHead className="w-[10%] text-xs font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="w-[18%] text-xs font-semibold text-muted-foreground">Validity</TableHead>
                    <TableHead className="w-[10%] text-center text-xs font-semibold text-muted-foreground">Sources</TableHead>
                    <TableHead className="w-[10%] text-right text-xs font-semibold text-muted-foreground pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageCoupons.map((coupon) => {
                    const usesPct = coupon.max_uses ? Math.round((coupon.uses_count / coupon.max_uses) * 100) : null;
                    const cfg = couponStatusConfig[coupon.status];
                    return (
                      <TableRow key={coupon.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors duration-150">
                        <TableCell className="py-3.5 pl-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-sm font-bold bg-muted px-1.5 py-0.5 rounded-md text-foreground">
                                {coupon.code}
                              </code>
                              <CopyCodeButton code={coupon.code} />
                            </div>
                            {coupon.description && (
                              <p className="text-xs text-muted-foreground/60 max-w-[160px] truncate">{coupon.description}</p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground tabular-nums">
                              {coupon.discount_type === 'percentage'
                                ? `${coupon.discount_value}%`
                                : fmtCurrency(coupon.discount_value)}
                            </span>
                            {coupon.discount_type === 'percentage' && (
                              <span className="text-xs text-muted-foreground/50 font-medium">off</span>
                            )}
                            {coupon.min_order_amount_minor && (
                              <p className="text-xs text-muted-foreground/60 mt-0.5">Min {fmtCurrency(coupon.min_order_amount_minor)}</p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-1.5 min-w-[70px]">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold tabular-nums text-foreground">{coupon.uses_count}</span>
                              {coupon.max_uses && (
                                <span className="text-xs text-muted-foreground/50 font-medium">/ {coupon.max_uses}</span>
                              )}
                            </div>
                            {usesPct !== null && (
                              <Progress value={usesPct} className="h-1.5 bg-muted/50" />
                            )}
                            {coupon.max_uses_per_user > 1 && (
                              <span className="text-xs text-muted-foreground/50">{coupon.max_uses_per_user}/user</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <StatusPill label={cfg.label} className={cfg.className} />
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                              <CalendarDays className="size-3 text-muted-foreground/40" />
                              {fmtDate(coupon.valid_from)}
                            </div>
                            {coupon.valid_until ? (
                              <span className="text-xs text-muted-foreground/50 ml-4.5">to {fmtDate(coupon.valid_until)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40 ml-4.5 italic">No expiry</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 text-center">
                          <div className="flex gap-1 justify-center">
                            {coupon.applicable_sources.map((source) => (
                              <Badge 
                                key={source} 
                                variant="outline" 
                                className={cn(
                                  "text-xs font-medium rounded-full px-2 py-0.5",
                                  source === 'lms' 
                                    ? "bg-blue-50/80 text-blue-700 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40" 
                                    : "bg-violet-50/80 text-violet-700 border-violet-200/60 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/40"
                                )}
                              >
                                {source === 'lms' ? 'LMS' : 'College'}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <CouponsClient coupons={pageCoupons} stats={{ active, totalUses, totalDiscount }} mode="edit" coupon={coupon} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages} ({total} total)
                  </span>
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        {hasPrev ? (
                          <PaginationPrevious href={`/commerce/coupons?page=${currentPage - 1}`} />
                        ) : (
                          <PaginationPrevious href="#" className="pointer-events-none opacity-50" />
                        )}
                      </PaginationItem>
                      {getPageRange(currentPage, totalPages).map((p) =>
                        p === 'ellipsis' ? (
                          <PaginationItem key="ellipsis">
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href={`/commerce/coupons?page=${p}`}
                              isActive={p === currentPage}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        {hasNext ? (
                          <PaginationNext href={`/commerce/coupons?page=${currentPage + 1}`} />
                        ) : (
                          <PaginationNext href="#" className="pointer-events-none opacity-50" />
                        )}
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="outline-none">
          <CouponsAnalyticsClient analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
