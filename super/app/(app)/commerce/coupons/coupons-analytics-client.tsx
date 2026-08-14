'use client';

import React, { useMemo } from 'react';
import {
  Tags,
  DollarSign,
  ShoppingCart,
  GraduationCap,
  History,
  Info,
  CreditCard,
  Percent,
  Download,
  Sparkles,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from '@/lib/recharts-client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { fmtCurrency } from '@/lib/commerce/format';
import { cn } from '@/lib/utils';
import type { CouponAnalyticsData } from '@/lib/services/coupons-analytics';

interface CouponsAnalyticsClientProps {
  analytics: CouponAnalyticsData;
}

const trendChartConfig = {
  redemptions: { label: 'Redemptions', color: 'oklch(0.52 0.14 145)' },
  revenue: { label: 'Revenue Generated', color: 'oklch(0.62 0.15 45)' },
} satisfies ChartConfig;

export function CouponsAnalyticsClient({ analytics }: CouponsAnalyticsClientProps) {
  const { summary, topCoupons, topCourses, dailyTrend, history } = analytics;

  const fmt = (minorAmount: number) => fmtCurrency(minorAmount);

  const chartData = useMemo(() => {
    return dailyTrend.map((d) => ({
      date: d.date,
      redemptions: d.redemptions,
      revenue: Math.round(d.revenueMinor / 100),
      discount: Math.round(d.discountMinor / 100),
    }));
  }, [dailyTrend]);

  const lmsPct = summary.totalRedemptions > 0 ? Math.round((summary.lmsRedemptionsCount / summary.totalRedemptions) * 100) : 0;
  const collegePct = summary.totalRedemptions > 0 ? Math.round((summary.collegeRedemptionsCount / summary.totalRedemptions) * 100) : 0;

  const exportToCSV = () => {
    const headers = ['Order ID', 'Date', 'Coupon Code', 'Status', 'Student Name', 'Student Email', 'Course/Entity', 'Source Portal', 'Discount (INR)', 'Amount Paid (INR)'];
    const rows = history.map((item) => [
      item.orderId,
      new Date(item.createdAt).toISOString().split('T')[0],
      item.couponCode,
      item.isDeleted ? 'Deleted' : 'Active',
      item.purchaserName || 'Student',
      item.purchaserEmail,
      item.entityTitle,
      item.source === 'lms' ? 'LMS' : 'College',
      (item.discountAmountMinor / 100).toFixed(2),
      (item.totalAmountMinor / 100).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `coupon_redemption_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 6 KPI Cards — 1 orange hero + 5 neutral chrome */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 stagger-1">
        {/* Total Redemptions — the orange hero */}
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
              <ShoppingCart className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Redemptions</p>
              <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">
                {summary.totalRedemptions.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Successful uses</p>
            </div>
          </div>
        </div>

        {/* Total Sales with Coupon — neutral */}
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2.5 text-muted-foreground shrink-0">
              <DollarSign className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Coupon Sales</p>
              <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">
                {fmt(summary.totalRevenueMinor)}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Checkout volume</p>
            </div>
          </div>
        </div>

        {/* Total Discount Given — neutral */}
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2.5 text-muted-foreground shrink-0">
              <Tags className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Total Saved</p>
              <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">
                {fmt(summary.totalDiscountMinor)}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Discounts given</p>
            </div>
          </div>
        </div>

        {/* Average Discount Size — neutral */}
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2.5 text-muted-foreground shrink-0">
              <Percent className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Avg. Discount</p>
              <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">
                {fmt(summary.avgDiscountMinor)}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Savings per order</p>
            </div>
          </div>
        </div>

        {/* Average Checkout Amount — neutral */}
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2.5 text-muted-foreground shrink-0">
              <CreditCard className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Avg. Checkout</p>
              <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">
                {fmt(summary.avgRevenueMinor)}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Checkout size</p>
            </div>
          </div>
        </div>

        {/* Active Coupons — neutral */}
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2.5 text-muted-foreground shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Active Coupons</p>
              <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">
                {summary.activeCouponsCount}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Redeemable codes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Channel Mix Row */}
      <div className="grid gap-4 lg:grid-cols-[2.5fr_1fr] stagger-2">
        {/* Daily Usage / Revenue Trend Chart */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Redemption & Revenue Trend</CardTitle>
                <CardDescription className="text-xs">
                  Usage and corresponding revenue generated over the last 30 days
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: 'oklch(0.52 0.14 145)' }} />
                  Redemptions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  Revenue
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4 pt-2">
            {summary.totalRedemptions === 0 ? (
              <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/5">
                <p className="text-sm text-muted-foreground">No coupon usage recorded in the last 30 days</p>
              </div>
            ) : (
              <ChartContainer config={trendChartConfig} className="aspect-auto h-[200px] w-full">
                <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    width={24}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    width={40}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => `\u20b9${val}`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        formatter={(value, name) => (
                          <div className="flex min-w-[140px] items-center justify-between gap-3 py-0.5">
                            <span className="text-muted-foreground text-xs">
                              {name === 'redemptions' ? 'Uses' : 'Revenue'}
                            </span>
                            <span className="font-mono font-semibold text-xs tabular-nums text-foreground">
                              {name === 'redemptions' ? value : `\u20b9${Number(value).toLocaleString()}`}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    yAxisId="left"
                    dataKey="redemptions"
                    type="monotone"
                    fill="oklch(0.52 0.14 145)"
                    fillOpacity={0.08}
                    stroke="oklch(0.52 0.14 145)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    dataKey="revenue"
                    type="monotone"
                    fill="oklch(0.62 0.15 45)"
                    fillOpacity={0.08}
                    stroke="oklch(0.62 0.15 45)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Portal Mix Channel Breakdown */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Channel Share</CardTitle>
            <CardDescription className="text-xs">Redemptions by source portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {summary.totalRedemptions === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-xs text-muted-foreground">No channel data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-500" />
                      LMS Portal
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {summary.lmsRedemptionsCount} uses ({lmsPct}%)
                    </span>
                  </div>
                  <Progress value={lmsPct} className="h-1.5 bg-blue-500/10 [&>[data-slot=progress-value]]:bg-blue-500" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-violet-500" />
                      College Admin
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {summary.collegeRedemptionsCount} uses ({collegePct}%)
                    </span>
                  </div>
                  <Progress value={collegePct} className="h-1.5 bg-violet-500/10 [&>[data-slot=progress-value]]:bg-violet-500" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Top Coupons / Top Courses */}
      <div className="grid gap-4 lg:grid-cols-2 stagger-3">
        {/* Top Coupons Ranking */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-muted p-1.5 text-muted-foreground">
                <Tags className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Top Coupons by Sales</CardTitle>
                <CardDescription className="text-xs">Most used coupon codes and their metrics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topCoupons.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center p-4 text-center">
                <p className="text-xs text-muted-foreground">No coupon sales data available</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20 max-h-[300px] overflow-y-auto">
                {topCoupons.map((coupon, i) => (
                  <div key={coupon.code} className="flex items-center justify-between p-3.5 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-foreground">
                            {coupon.code}
                          </code>
                          {coupon.isDeleted ? (
                            <Badge variant="outline" className="text-[10px] h-4 bg-red-500/10 text-red-600 border-red-500/20 px-1.5 py-0 font-medium rounded-full uppercase">
                              Deleted
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-4 px-1.5 py-0 font-medium rounded-full uppercase",
                                coupon.status === 'active'
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                              )}
                            >
                              {coupon.status || 'inactive'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{coupon.usesCount} uses</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Sales: {fmt(coupon.totalRevenueMinor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Courses Ranking */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-muted p-1.5 text-muted-foreground">
                <GraduationCap className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Top Courses Sold via Coupons</CardTitle>
                <CardDescription className="text-xs">Courses that generate the highest discount purchases</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topCourses.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center p-4 text-center">
                <p className="text-xs text-muted-foreground">No course statistics available</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20 max-h-[300px] overflow-y-auto">
                {topCourses.map((course, i) => (
                  <div key={course.title} className="flex items-center justify-between p-3.5 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-semibold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <span className="text-xs font-medium text-foreground truncate max-w-[280px]">
                        {course.title}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold">{course.usesCount} purchases</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Sales: {fmt(course.totalRevenueMinor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Redemptions History */}
      <div className="stagger-4">
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-muted p-1.5 text-muted-foreground">
                  <History className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight">Redemption Ledger</CardTitle>
                  <CardDescription className="text-xs">Audit log of all successful purchases using coupons</CardDescription>
                </div>
              </div>
              {history.length > 0 && (
                <Button onClick={exportToCSV} variant="outline" size="sm" className="h-8 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <Download className="size-3" />
                  Export CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="size-6 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No successful coupon transactions recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <Table className="row-enter" containerClassName="scrollbar-hide">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/5 border-b border-border/30">
                      <TableHead className="text-xs font-semibold text-muted-foreground pl-6">Order ID</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Coupon</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Student</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Purchased Course</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-muted-foreground">Portal</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Discount</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground pr-6">Amount Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.orderId} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                        <TableCell className="py-3 pl-6">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{item.orderId.slice(0, 8).toUpperCase()}
                          </span>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-xs font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">
                              {item.couponCode}
                            </code>
                            {item.isDeleted && (
                              <Badge variant="outline" className="text-[10px] h-3.5 bg-red-500/10 text-red-600 border-red-500/20 px-1 py-0 rounded-full font-medium">
                                Deleted
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <p className="text-xs font-semibold text-foreground max-w-[150px] truncate">
                            {item.purchaserName || 'Student'}
                          </p>
                          <p className="text-xs text-muted-foreground max-w-[150px] truncate mt-0.5">
                            {item.purchaserEmail}
                          </p>
                        </TableCell>

                        <TableCell className="py-3">
                          <p className="text-xs font-medium text-foreground max-w-[200px] truncate">
                            {item.entityTitle}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">
                            {item.entityType.replace('_', ' ')}
                          </p>
                        </TableCell>

                        <TableCell className="py-3 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium rounded-full px-2 py-0.5",
                              item.source === 'lms'
                                ? "bg-blue-50/80 text-blue-700 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40"
                                : "bg-violet-50/80 text-violet-700 border-violet-200/60 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/40"
                            )}
                          >
                            {item.source === 'lms' ? 'LMS' : 'College'}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 font-mono text-xs text-muted-foreground font-semibold">
                          -{fmt(item.discountAmountMinor)}
                        </TableCell>

                        <TableCell className="py-3 pr-6 text-right font-mono text-xs font-bold text-foreground">
                          {fmt(item.totalAmountMinor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
