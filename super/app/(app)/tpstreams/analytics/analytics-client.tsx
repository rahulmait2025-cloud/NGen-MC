'use client';

import { useEffect, useCallback, useReducer } from 'react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Activity,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getTpOperationalSummaryAction } from '../actions';

interface TpSummary {
  assets: { total: number; processing: number; failed: number };
  webhooks: { recent_24h: number; failures_24h: number };
}

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}

type SummaryAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: TpSummary }
  | { type: 'FETCH_ERROR' };

function summaryReducer(
  state: { summary: TpSummary | null; refreshing: boolean },
  action: SummaryAction
): { summary: TpSummary | null; refreshing: boolean } {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, refreshing: true };
    case 'FETCH_SUCCESS':
      return { summary: action.payload, refreshing: false };
    case 'FETCH_ERROR':
      return { ...state, refreshing: false };
    default:
      return state;
  }
}

export function TpAnalyticsClient({ initialSummary }: { initialSummary: TpSummary | null }): ReactNode {
  const [{ summary, refreshing }, dispatch] = useReducer(summaryReducer, {
    summary: initialSummary,
    refreshing: false,
  });

  useEffect(() => {
    if (!initialSummary) {
      getTpOperationalSummaryAction().then((res) => {
        if (res.ok) dispatch({ type: 'FETCH_SUCCESS', payload: res.data as TpSummary });
      });
    }
  }, [initialSummary]);

  const fetchSummary = useCallback(async () => {
    try {
      dispatch({ type: 'FETCH_START' });
      const res = await getTpOperationalSummaryAction();
      if (res.ok) {
        dispatch({ type: 'FETCH_SUCCESS', payload: res.data as TpSummary });
      } else {
        toast.error(res.error || 'Failed to fetch summary');
        dispatch({ type: 'FETCH_ERROR' });
      }
    } catch {
      toast.error('An error occurred');
      dispatch({ type: 'FETCH_ERROR' });
    }
  }, []);

  if (!summary) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <Loader2 className="size-4 animate-spin" />
        Loading analytics...
      </div>
    );
  }

  const { assets, webhooks } = summary;
  const healthy = assets.total - assets.failed - assets.processing;
  const healthPct = assets.total > 0 ? Math.round((healthy / assets.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Metric label="Total" value={assets.total} />
          <Metric label="Healthy" value={healthy} />
          <Metric label="Processing" value={assets.processing} />
          <Metric label="Failed" value={assets.failed} />
          <Metric label="Webhooks 24h" value={webhooks.recent_24h} hint={webhooks.failures_24h > 0 ? `(${webhooks.failures_24h} failed)` : undefined} />
        </div>
        <Button onClick={fetchSummary} variant="ghost" size="sm" disabled={refreshing} className="gap-1.5 text-muted-foreground">
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="h-px bg-border" />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-1">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Pipeline Status</h3>
          <StatusRow
            icon={<Activity className="size-4" />}
            label="Content Processing"
            detail={assets.failed === 0 ? 'Operating normally' : `${assets.failed} assets failed`}
            ok={assets.failed === 0}
          />
          <StatusRow
            icon={<Webhook className="size-4" />}
            label="Webhook Delivery"
            detail={webhooks.failures_24h === 0 ? 'Reliable delivery' : `${webhooks.failures_24h} failures in 24h`}
            ok={webhooks.failures_24h === 0}
          />
          <StatusRow
            icon={<RefreshCw className="size-4" />}
            label="Metadata Sync"
            detail="Runs hourly"
            ok
          />
        </div>

        <div>
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Asset Health</h3>
          <div className="space-y-3">
            <BarSegment label="Healthy" count={healthy} total={assets.total} color="bg-emerald-500" />
            <BarSegment label="Processing" count={assets.processing} total={assets.total} color="bg-blue-500" />
            <BarSegment label="Failed" count={assets.failed} total={assets.total} color="bg-red-500" />
          </div>
          <div className="mt-4 pt-3 border-t text-[13px] text-muted-foreground">
            {healthPct}% healthy across {assets.total} assets
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ icon: _icon, label, detail, ok }: { icon: ReactNode; label: string; detail: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={`p-1 rounded ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
        {ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium">{label}</span>
      </div>
      <span className="text-[13px] text-muted-foreground">{detail}</span>
    </div>
  );
}

function BarSegment({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-[width] duration-300 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
