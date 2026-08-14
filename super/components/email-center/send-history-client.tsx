'use client';

import { useMemo, useState, useCallback, useReducer } from 'react';
import Link from 'next/link';
import { EmailCenterShell } from './email-center-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
} from '@/components/ui/pagination';
import type { EmailSendHistoryRow } from '@/lib/email-center/history';
import { ExternalLink, History, Loader2 } from 'lucide-react';
import { getEmailHistoryPageAction } from '@/app/(app)/email-center/actions';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  test_sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  sending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

type StatusFilter = 'all' | EmailSendHistoryRow['status'];

function formatWhen(iso: string | null): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

interface HistoryDataState {
  allRows: EmailSendHistoryRow[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

type HistoryDataAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; rows: EmailSendHistoryRow[]; hasMore: boolean }
  | { type: 'LOAD_ERROR'; error: string };

function historyDataReducer(state: HistoryDataState, action: HistoryDataAction): HistoryDataState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return { allRows: [...state.allRows, ...action.rows], hasMore: action.hasMore, loading: false, error: null };
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

export function SendHistoryClient({
  initialRows,
  hasMore: initialHasMore,
  pageSize,
}: {
  initialRows: EmailSendHistoryRow[];
  hasMore: boolean;
  pageSize: number;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [{ allRows, hasMore, loading, error }, dispatch] = useReducer(historyDataReducer, {
    allRows: initialRows,
    hasMore: initialHasMore,
    loading: false,
    error: null,
  });

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    dispatch({ type: 'LOAD_START' });

    try {
      const result = await getEmailHistoryPageAction(pageSize, allRows.length);
      if (result.ok && result.rows) {
        dispatch({ type: 'LOAD_SUCCESS', rows: result.rows!, hasMore: result.hasMore ?? false });
      } else {
        dispatch({ type: 'LOAD_ERROR', error: result.error ?? 'Failed to load more' });
      }
    } catch {
      dispatch({ type: 'LOAD_ERROR', error: 'Failed to load more rows' });
    }
  }, [loading, hasMore, pageSize, allRows.length]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesQuery =
        !q
        || row.name.toLowerCase().includes(q)
        || row.audience_summary.toLowerCase().includes(q)
        || row.campaign_type.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [allRows, searchQuery, statusFilter]);

  const visibleCount = filtered.length;
  const totalCount = allRows.length;

  return (
    <EmailCenterShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Send History</h1>
          <p className="text-muted-foreground">
            Campaign delivery history from saved sends and outbox activity.
          </p>
        </div>

        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="history-search">Search</Label>
              <Input
                id="history-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by campaign name or audience"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="history-status">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger id="history-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="test_sent">Test sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
            <CardContent className="py-3 px-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </CardContent>
          </Card>
        )}

        {initialRows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <History className="size-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-card-foreground">No campaign sends yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                When you queue or send a campaign, it will appear here with delivery counts.
              </p>
              <Button asChild className="mt-4">
                <Link href="/email-center/campaigns">View Campaigns</Link>
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No history rows match your filters.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {visibleCount} of {totalCount} campaigns
              </span>
            </div>

            <div className="hidden lg:block rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium">Campaign</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Audience</th>
                    <th className="px-4 py-3 font-medium text-right">Recipients</th>
                    <th className="px-4 py-3 font-medium text-right">Queued</th>
                    <th className="px-4 py-3 font-medium text-right">Sent</th>
                    <th className="px-4 py-3 font-medium text-right">Failed</th>
                    <th className="px-4 py-3 font-medium text-right">Skipped</th>
                    <th className="px-4 py-3 font-medium text-right">Opened</th>
                    <th className="px-4 py-3 font-medium text-right">Clicked</th>
                    <th className="px-4 py-3 font-medium text-right">Bounced</th>
                    <th className="px-4 py-3 font-medium">Sent at</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{row.campaign_type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[row.status] ?? ''}>{row.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate" title={row.audience_summary}>
                        {row.audience_summary}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.recipient_count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.queued}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.sent}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.failed}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.skipped}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.opened}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.clicked}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.bounced}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatWhen(row.sent_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm" className="gap-1">
                          <Link href={`/email-center/campaigns/${row.id}`}>
                            View
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-3">
              {filtered.map((row) => (
                <Card key={row.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{row.campaign_type.replace(/_/g, ' ')}</p>
                      </div>
                      <Badge className={statusColors[row.status] ?? ''}>{row.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{row.audience_summary}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Recipients</p>
                        <p className="font-semibold tabular-nums">{row.recipient_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Sent</p>
                        <p className="font-semibold tabular-nums">{row.sent}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Failed</p>
                        <p className="font-semibold tabular-nums">{row.failed}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Queued: {row.queued}</span>
                      <span>Skipped: {row.skipped}</span>
                      <span>Opened: {row.opened}</span>
                      <span>Clicked: {row.clicked}</span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full gap-1">
                      <Link href={`/email-center/campaigns/${row.id}`}>
                        View Campaign
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="flex flex-col items-center gap-3 pt-2">
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); loadMore(); }}
                        className={loading ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading more...
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </EmailCenterShell>
  );
}
