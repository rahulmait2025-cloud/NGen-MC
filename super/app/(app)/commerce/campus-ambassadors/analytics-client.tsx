'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, TrendingUp, IndianRupee, BarChart3 } from 'lucide-react';
import type { AmbassadorAnalytics } from '@/lib/services/campus-ambassador-admin';

function fmtCurrency(minor: number): string {
  return `\u20B9${(minor / 100).toLocaleString('en-IN')}`;
}

interface AnalyticsClientProps {
  analytics: AmbassadorAnalytics;
}

export function AnalyticsClient({ analytics }: AnalyticsClientProps) {
  return (
    <div className="space-y-5">
      {/* Summary Cards — commission ledger (not customer revenue) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{analytics.activeAmbassadors}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/60">{analytics.totalAmbassadors} total</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commission</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{fmtCurrency(analytics.totalGeneratedMinor)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/60">Commission earned</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <IndianRupee className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid Out</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{fmtCurrency(analytics.totalPayoutsMadeMinor)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/60">{fmtCurrency(analytics.totalRemainingMinor)} remaining</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <BarChart3 className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{fmtCurrency(analytics.totalRemainingMinor)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/60">Pending payouts</p>
        </div>
      </div>

      {/* Leaderboards — canonical analytics view (matches LMS) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top by Net Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.leaderboardByGenerated.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.leaderboardByGenerated.map((row, i) => (
                  <div key={row.ambassador_id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors">
                    <span className={`w-6 text-center text-xs font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground/50'}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{row.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.college_name}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums font-mono">{fmtCurrency(row.net_revenue_minor)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top by Paid Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.leaderboardByOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.leaderboardByOrders.map((row, i) => (
                  <div key={row.ambassador_id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors">
                    <span className={`w-6 text-center text-xs font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground/50'}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{row.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.college_name}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums font-mono">{row.paid_referrals} paid</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Net Revenue by College</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.collegeBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="text-xs font-medium text-muted-foreground/70 pl-5 py-2.5">College</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5 text-center">Ambassadors</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5 text-center">Paid refs</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5 text-right pr-5">Net revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.collegeBreakdown.map((row) => (
                    <TableRow key={row.college_name} className="border-b border-border/30 last:border-0">
                      <TableCell className="py-3 pl-5 font-medium text-sm">{row.college_name}</TableCell>
                      <TableCell className="py-3 text-center text-sm tabular-nums">{row.ambassador_count}</TableCell>
                      <TableCell className="py-3 text-center text-sm tabular-nums">{row.paid_referrals}</TableCell>
                      <TableCell className="py-3 text-right pr-5 text-sm font-bold tabular-nums font-mono">
                        {fmtCurrency(row.net_revenue_minor)}
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
  );
}
