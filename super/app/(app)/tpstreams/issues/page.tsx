'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useReducer, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  Search,
  FileVideo,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProblematicAssetsAction } from '../actions';
import { syncVideoAssetAction } from '@/app/(app)/master-courses/[courseId]/video-assets/actions';

interface ProblematicAsset {
  id: string;
  title: string;
  tp_asset_id: string;
  updated_at: string;
  course?: { title: string };
}

interface Problems {
  failed: ProblematicAsset[];
  stuck: ProblematicAsset[];
}

type IssuesUiState = { isLoading: boolean; isSyncing: string | null };
type IssuesUiAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_END' }
  | { type: 'SYNC_START'; assetId: string }
  | { type: 'SYNC_END' };

function issuesUiReducer(state: IssuesUiState, action: IssuesUiAction): IssuesUiState {
  switch (action.type) {
    case 'LOAD_START': return { ...state, isLoading: true };
    case 'LOAD_END': return { ...state, isLoading: false };
    case 'SYNC_START': return { ...state, isSyncing: action.assetId };
    case 'SYNC_END': return { ...state, isSyncing: null };
  }
}

export default function TpIssuesPage(): ReactNode {
  const [{ isLoading, isSyncing }, dispatch] = useReducer(issuesUiReducer, { isLoading: true, isSyncing: null });
  const [data, setData] = useState<Problems>({ failed: [], stuck: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('failed');

  useEffect(() => { fetchIssues(); }, []);

  const fetchIssues = async () => {
    try {
      dispatch({ type: 'LOAD_START' });
      const res = await getProblematicAssetsAction();
      if (res.ok) setData(res.data as Problems);
      else toast.error(res.error || 'Failed to fetch issues');
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'LOAD_END' });
    }
  };

  const handleRetrySync = async (assetId: string) => {
    try {
      dispatch({ type: 'SYNC_START', assetId });
      const fd = new FormData();
      fd.append('asset_id', assetId);
      const res = await syncVideoAssetAction(fd);
      if (res.ok) { toast.success('Metadata synced'); fetchIssues(); }
      else toast.error(res.error || 'Sync failed');
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'SYNC_END' });
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredFailed = useMemo(() => data.failed.filter((a) => a.title.toLowerCase().includes(q) || a.tp_asset_id.toLowerCase().includes(q)), [data.failed, q]);
  const filteredStuck = useMemo(() => data.stuck.filter((a) => a.title.toLowerCase().includes(q) || a.tp_asset_id.toLowerCase().includes(q)), [data.stuck, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search title or asset ID..."
            className="pl-8 h-8 text-[13px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={fetchIssues} variant="ghost" size="sm" disabled={isLoading} className="gap-1.5 text-muted-foreground">
          <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gap-0.5">
          <TabsTrigger value="failed" className="gap-1.5 text-[13px] px-3">
            Failed
            {data.failed.length > 0 && <span className="ml-1 text-[10px] font-semibold text-red-600">{data.failed.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="stuck" className="gap-1.5 text-[13px] px-3">
            Stuck
            {data.stuck.length > 0 && <span className="ml-1 text-[10px] font-semibold text-amber-600">{data.stuck.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="failed" className="mt-3">
          {isLoading ? (
            <LoadingRows />
          ) : filteredFailed.length === 0 ? (
            <EmptyState icon={<FileVideo className="size-5" />} text="No failed assets detected." />
          ) : (
            <div className="border rounded-lg divide-y">
              {filteredFailed.map((asset) => (
                <AssetRow key={asset.id} asset={asset} variant="failed" isSyncing={isSyncing === asset.id} onRetry={handleRetrySync} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stuck" className="mt-3">
          {isLoading ? (
            <LoadingRows />
          ) : filteredStuck.length === 0 ? (
            <EmptyState icon={<Clock className="size-5" />} text="No stuck assets detected." />
          ) : (
            <>
              <div className="flex items-start gap-2 px-3 py-2.5 mb-3 rounded-md bg-blue-50 text-[12px] text-blue-800">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                <span>Assets stuck in processing for 4+ hours. Usually indicates webhook delivery failure or a TPStreams processing delay.</span>
              </div>
              <div className="border rounded-lg divide-y">
                {filteredStuck.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} variant="stuck" isSyncing={isSyncing === asset.id} onRetry={handleRetrySync} />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssetRow({ asset, variant, isSyncing, onRetry }: { asset: ProblematicAsset; variant: 'failed' | 'stuck'; isSyncing: boolean; onRetry: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className={`p-1 rounded ${variant === 'failed' ? 'text-red-500' : 'text-amber-500'}`}>
        {variant === 'failed' ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{asset.title}</span>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{asset.tp_asset_id}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[12px] text-muted-foreground">
          <span className="truncate">{asset.course?.title || 'Unknown course'}</span>
          <span suppressHydrationWarning>{formatDistanceToNow(new Date(asset.updated_at))} ago</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onRetry(asset.id)} disabled={isSyncing} className="h-7 gap-1 text-[12px]">
          <RefreshCw className={`size-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {variant === 'failed' ? 'Retry' : 'Check'}
        </Button>
        <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
          <a href={`https://app.tpstreams.com/assets/${asset.tp_asset_id}/`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <div className="opacity-40">{icon}</div>
      <span className="text-[13px]">{text}</span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
      <Loader2 className="size-4 animate-spin" />
      Loading issues...
    </div>
  );
}
