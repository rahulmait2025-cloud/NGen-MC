'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import {
  RefreshCw,
  User,
  Database,
  Loader2,
  CheckCircle2,
  Loader,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getRecentSyncLogsAction } from '../actions';

interface SyncLog {
  id: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  inserted_count: number;
  updated_count: number;
  missing_count: number;
  failed_count: number;
  triggered_by_profile?: { full_name: string };
  course?: { title: string };
}

export default function TpSyncHistoryPage(): ReactNode {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<SyncLog[]>([]);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await getRecentSyncLogsAction(30);
      if (res.ok) setLogs(res.data as SyncLog[]);
      else toast.error(res.error || 'Failed to fetch sync logs');
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">{logs.length} sync runs recorded</span>
        <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={isLoading} className="gap-1.5 text-muted-foreground">
          <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading sync history...
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Database className="size-5 opacity-40" />
          <span className="text-[13px]">No sync runs recorded yet.</span>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {logs.map((log) => (
            <SyncLogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function SyncLogRow({ log }: { log: SyncLog }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className={`p-1 rounded ${log.completed_at ? 'text-emerald-500' : 'text-blue-500'}`}>
        {log.completed_at ? <CheckCircle2 className="size-3.5" /> : <Loader className="size-3.5 animate-spin" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium capitalize">{log.sync_type.replace('_', ' ')}</span>
          {log.course && (
            <span className="text-[12px] text-muted-foreground truncate max-w-[200px]" title={log.course.title}>
              {log.course.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[12px] text-muted-foreground">
          <span suppressHydrationWarning>{format(new Date(log.started_at), 'MMM d, HH:mm')}</span>
          <span suppressHydrationWarning>{formatDistanceToNow(new Date(log.started_at))} ago</span>
          {log.triggered_by_profile && (
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {log.triggered_by_profile.full_name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 text-[12px] tabular-nums">
        <div className="flex items-center gap-1">
          <span className="text-emerald-600 font-medium">+{log.inserted_count}</span>
          <span className="text-muted-foreground">ins</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-blue-600 font-medium">{log.updated_count}</span>
          <span className="text-muted-foreground">upd</span>
        </div>
        {log.missing_count > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-amber-600 font-medium">{log.missing_count}</span>
            <span className="text-muted-foreground">miss</span>
          </div>
        )}
        {log.failed_count > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-red-600 font-medium">{log.failed_count}</span>
            <span className="text-muted-foreground">fail</span>
          </div>
        )}
      </div>
    </div>
  );
}
