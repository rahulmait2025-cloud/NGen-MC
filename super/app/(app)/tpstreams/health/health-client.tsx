'use client';

import type { ReactNode } from 'react';
import { useEffect, useCallback, useReducer } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { runTpHealthChecksAction } from '../actions';

export interface HealthCheck {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: string;
}

export interface TpHealthChecks {
  api: HealthCheck;
  webhooks_config: HealthCheck;
  webhook_delivery: HealthCheck;
  db_drift: HealthCheck;
  folders: HealthCheck;
}

const CHECK_LABELS: Record<keyof TpHealthChecks, string> = {
  api: 'API Connectivity',
  webhooks_config: 'Webhook Config',
  webhook_delivery: 'Webhook Delivery (24h)',
  db_drift: 'Database Sync',
  folders: 'Folder Mappings',
};

function StatusDot({ status }: { status: string }) {
  if (status === 'healthy') return <CheckCircle2 className="size-3.5 text-emerald-500" />;
  if (status === 'warning') return <AlertTriangle className="size-3.5 text-amber-500" />;
  return <XCircle className="size-3.5 text-red-500" />;
}

function StatusPill({ status }: { status: string }) {
  const base = 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide';
  if (status === 'healthy') return <span className={`${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400`}>OK</span>;
  if (status === 'warning') return <span className={`${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400`}>Warn</span>;
  return <span className={`${base} bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400`}>Fail</span>;
}

type HealthAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: TpHealthChecks }
  | { type: 'FETCH_ERROR' };

function healthReducer(
  state: { isLoading: boolean; checks: TpHealthChecks | null },
  action: HealthAction
): { isLoading: boolean; checks: TpHealthChecks | null } {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true };
    case 'FETCH_SUCCESS':
      return { checks: action.payload, isLoading: false };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

export function TpHealthClient({ initialChecks }: { initialChecks: TpHealthChecks | null }): ReactNode {
  const [{ isLoading, checks }, dispatch] = useReducer(healthReducer, {
    isLoading: false,
    checks: initialChecks,
  });

  useEffect(() => {
    if (!initialChecks) {
      runTpHealthChecksAction().then((res) => {
        if (res.ok) dispatch({ type: 'FETCH_SUCCESS', payload: res.data as TpHealthChecks });
      });
    }
  }, [initialChecks]);

  const runChecks = useCallback(async () => {
    try {
      dispatch({ type: 'FETCH_START' });
      const res = await runTpHealthChecksAction();
      if (res.ok) {
        dispatch({ type: 'FETCH_SUCCESS', payload: res.data as TpHealthChecks });
      } else {
        toast.error(res.error || 'Failed to run health checks');
        dispatch({ type: 'FETCH_ERROR' });
      }
    } catch {
      toast.error('An error occurred');
      dispatch({ type: 'FETCH_ERROR' });
    }
  }, []);

  const allHealthy = checks ? Object.values(checks).every((c) => c.status === 'healthy') : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {checks && (
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${allHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {allHealthy ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              {allHealthy ? 'All systems operational' : 'Issues detected'}
            </span>
          )}
        </div>
        <Button onClick={runChecks} variant="ghost" size="sm" disabled={isLoading} className="gap-1.5 text-muted-foreground">
          <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Run Diagnostics
        </Button>
      </div>

      {!checks ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
          <Loader2 className="size-4 animate-spin" />
          Running diagnostics...
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {(Object.keys(CHECK_LABELS) as Array<keyof TpHealthChecks>).map((key) => {
            const check = checks[key];
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                <StatusDot status={check.status} />
                <span className="text-[13px] font-medium flex-1">{CHECK_LABELS[key]}</span>
                <span className="text-[13px] text-muted-foreground max-w-[320px] truncate">{check.message}</span>
                <StatusPill status={check.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
