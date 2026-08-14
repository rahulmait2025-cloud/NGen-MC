'use client';

import { useState, useReducer, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Loader2, FolderOpen, Video, Package, AlertCircle, CheckCircle, FolderX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  syncTpStreamsAction,
  syncTpFoldersAction,
  syncTpAssetsAction,
} from '@/app/(app)/master-courses/sync-actions';
import type {
  ReflectedFolder,
  ReflectedAsset,
  SyntheticRootBucket,
} from '@/lib/services/tpstreams-sync';
import type { MasterCourseWithStats } from '@/lib/services/master-courses';

type SyncUiState = { isSyncing: boolean; syncMessage: string | null; lastSyncTime: Date | null };
type SyncUiAction =
  | { type: 'SYNC_START' }
  | { type: 'SYNC_ERROR'; message: string }
  | { type: 'SYNC_SUCCESS'; message: string }
  | { type: 'SYNC_END' }
  | { type: 'SET_MESSAGE'; message: string };

function syncUiReducer(state: SyncUiState, action: SyncUiAction): SyncUiState {
  switch (action.type) {
    case 'SYNC_START': return { ...state, isSyncing: true, syncMessage: null };
    case 'SYNC_ERROR': return { ...state, syncMessage: action.message };
    case 'SYNC_SUCCESS': return { ...state, syncMessage: action.message, lastSyncTime: new Date() };
    case 'SYNC_END': return { ...state, isSyncing: false };
    case 'SET_MESSAGE': return { ...state, syncMessage: action.message };
  }
}

interface SyncClientProps {
  initialCourses: MasterCourseWithStats[];
  initialFolderData: {
    folders: ReflectedFolder[];
    stats: { total: number; matched: number; unmatched: number; updated: number };
  } | null;
  initialAssetData: {
    assets: ReflectedAsset[];
    rootAssets: ReflectedAsset[];
    stats: {
      total: number;
      matched: number;
      unmatched: number;
      rootLevel: number;
      created: number;
      updated: number;
      skipped_list_rows?: number;
    };
  } | null;
  initialSyntheticBucket: SyntheticRootBucket | null;
  initialError: string | null;
}

type SyncTab = 'overview' | 'folders' | 'assets' | 'root-videos';

interface TabButtonProps {
  tab: SyncTab;
  label: string;
  icon?: ReactNode;
  count?: number;
  activeTab: SyncTab;
  onClick: (tab: SyncTab) => void;
}

function TabButton({ tab, label, icon, count, activeTab, onClick }: TabButtonProps) {
  return (
    <button type="button"
      onClick={() => onClick(tab)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label} {count !== undefined ? `(${count})` : ''}
    </button>
  );
}

interface SyncStatsCardsProps {
  stats: {
    totalCourses: number;
    syncedCourses: number;
    totalFolders: number;
    matchedFolders: number;
    totalAssets: number;
    matchedAssets: number;
    rootAssets: number;
    skippedListRows: number;
  };
}

function SyncStatsCards({ stats }: SyncStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Master Courses</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {stats.totalCourses}
          <span className="text-sm text-muted-foreground ml-2">
            ({stats.syncedCourses} synced)
          </span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">TP Folders</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {stats.totalFolders}
          <span className="text-sm text-muted-foreground ml-2">
            ({stats.matchedFolders} matched)
          </span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">TP Assets</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {stats.totalAssets}
          <span className="text-sm text-muted-foreground ml-2">
            ({stats.matchedAssets} matched)
          </span>
          {stats.skippedListRows > 0 && (
            <div className="text-xs font-normal text-amber-700 dark:text-amber-400 mt-1">
              {stats.skippedListRows} list row{stats.skippedListRows !== 1 ? 's' : ''} skipped (sparse API data)
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Root Videos</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {stats.rootAssets}
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewTab({ stats, syntheticBucket }: { stats: SyncStatsCardsProps['stats']; syntheticBucket: SyntheticRootBucket | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Overview</CardTitle>
        <CardDescription>
          Current state of TPStreams ↔ SuperAdmin reconciliation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Master Courses → TPStreams</h3>
              <p className="text-sm text-muted-foreground">
                {stats.syncedCourses} of {stats.totalCourses} courses have TPStreams folders.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  Folders created automatically on course creation
                </span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">TPStreams → SuperAdmin</h3>
              <p className="text-sm text-muted-foreground">
                {stats.matchedFolders} folders and {stats.matchedAssets} assets matched local records.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <FolderOpen className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Use &quot;Sync All&quot; to reflect dashboard content
                </span>
              </div>
            </div>
          </div>
          {stats.rootAssets > 0 && (
            <div className="p-4 border rounded-lg bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/30">
              <h3 className="font-medium mb-2 text-amber-800 dark:text-amber-300">Root-Level Videos Detected</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {stats.rootAssets} videos exist in TPStreams without a parent folder.
                These are shown under the synthetic &quot;{syntheticBucket?.title}&quot; bucket.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  These can be moved to folders later via Move Asset API
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FoldersTab({ folderData }: { folderData: { folders: ReflectedFolder[] } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>TPStreams Folders</CardTitle>
        <CardDescription>
          All folders from TPStreams API. Matched folders are linked to Master Courses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {folderData.folders.length === 0 ? (
          <div className="text-center py-12">
            <FolderX className="size-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No TPStreams Folders</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Folders created in TPStreams dashboard will appear here after sync.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folder Title</TableHead>
                <TableHead>UUID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matched Course</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folderData.folders.map((folder) => (
                <TableRow key={folder.tp_folder_uuid}>
                  <TableCell className="font-medium">{folder.title}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {folder.tp_folder_uuid}
                  </TableCell>
                  <TableCell>
                    {folder.matched_course_id ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        Matched
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Unmatched</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {folder.matched_course_id ? (
                      <div>
                        <div className="font-medium">{folder.matched_course_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {folder.matched_course_id}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Created outside app
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AssetsTab({ assetData }: { assetData: { assets: ReflectedAsset[] } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>TPStreams Assets (Videos)</CardTitle>
        <CardDescription>
          All video assets from TPStreams API. Root-level videos appear in synthetic bucket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assetData.assets.length === 0 ? (
          <div className="text-center py-12">
            <Video className="size-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No TPStreams Video Assets</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Videos uploaded in TPStreams dashboard will appear here after sync.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Title</TableHead>
                <TableHead>TP Asset ID</TableHead>
                <TableHead>Parent Folder</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Local Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetData.assets.filter((a) => !a.is_root_level).map((asset) => (
                <TableRow key={asset.tp_asset_id}>
                  <TableCell className="font-medium">{asset.title}</TableCell>
                  <TableCell className="font-mono text-xs">{asset.tp_asset_id}</TableCell>
                  <TableCell>
                    {asset.parent_id ? (
                      <span className="font-mono text-xs">{asset.parent_id}</span>
                    ) : (
                      <span className="text-muted-foreground">Root</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {asset.matched_local_id ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        Matched
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Unmatched</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {asset.matched_local_id ? (
                      <div>
                        <div className="font-medium">{asset.matched_local_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {asset.matched_local_id}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not tracked locally</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RootVideosTab({ assetData, syntheticBucket }: { assetData: { rootAssets: ReflectedAsset[] }; syntheticBucket: SyntheticRootBucket | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Package className="size-5 inline mr-2" />
          {syntheticBucket?.title ?? 'TP Root Videos'}
        </CardTitle>
        <CardDescription>
          Videos in TPStreams with no parent folder. This is a synthetic bucket for UI organization only.
          No real TPStreams folder is created for these.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assetData.rootAssets.length === 0 ? (
          <div className="text-center py-12">
            <Package className="size-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Root-Level Videos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Videos uploaded to the root in TPStreams will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Title</TableHead>
                <TableHead>TP Asset ID</TableHead>
                <TableHead>Local Match</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetData.rootAssets.map((asset) => (
                <TableRow key={asset.tp_asset_id}>
                  <TableCell className="font-medium">{asset.title}</TableCell>
                  <TableCell className="font-mono text-xs">{asset.tp_asset_id}</TableCell>
                  <TableCell>
                    {asset.matched_local_id ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        {asset.matched_local_title}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not tracked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      Can be moved via Move Asset API
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="text-xs text-muted-foreground">
          <Package className="size-3.5 inline mr-1" />
          Synthetic bucket - not a real TPStreams folder. Assets can be moved to course folders later.
        </div>
      </CardFooter>
    </Card>
  );
}

export function SyncClient({
  initialCourses,
  initialFolderData,
  initialAssetData,
  initialSyntheticBucket,
  initialError,
}: SyncClientProps) {
  const [{ isSyncing, syncMessage, lastSyncTime }, syncDispatch] = useReducer(syncUiReducer, {
    isSyncing: false,
    syncMessage: initialError,
    lastSyncTime: null,
  });

  const [activeTab, setActiveTab] = useState<SyncTab>('overview');
  const [folderData, setFolderData] = useState(initialFolderData);
  const [assetData, setAssetData] = useState(initialAssetData);
  const [syntheticBucket, setSyntheticBucket] = useState(initialSyntheticBucket);

  const handleFullSync = async () => {
    syncDispatch({ type: 'SYNC_START' });

    try {
      const result = await syncTpStreamsAction();

      if (result.ok && result.data) {
        syncDispatch({ type: 'SYNC_SUCCESS', message: result.data.message ?? 'Sync completed successfully' });
        toast.success('TPStreams sync completed');
        
        // Refresh folder and asset data
        await refreshFoldersAndAssets();
      } else {
        syncDispatch({ type: 'SYNC_ERROR', message: result.error ?? 'Sync failed' });
        toast.error(result.error ?? 'Sync failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      syncDispatch({ type: 'SYNC_ERROR', message });
      toast.error(message);
    } finally {
      syncDispatch({ type: 'SYNC_END' });
    }
  };

  const refreshFoldersAndAssets = async () => {
    try {
      const [folderResult, assetResult] = await Promise.all([
        syncTpFoldersAction(),
        syncTpAssetsAction(),
      ]);

      if (folderResult.ok && folderResult.data) {
        setFolderData(folderResult.data);
      }

      if (assetResult.ok && assetResult.data) {
        setAssetData(assetResult.data);
        setSyntheticBucket(assetResult.data.syntheticBucket);
      }
    } catch (err) {
      console.error('[tp-sync] Failed to refresh:', err);
    }
  };

  const stats = {
    totalCourses: initialCourses.length,
    syncedCourses: initialCourses.filter((c) => c.tp_folder_status === 'created').length,
    totalFolders: folderData?.stats.total ?? 0,
    matchedFolders: folderData?.stats.matched ?? 0,
    totalAssets: assetData?.stats.total ?? 0,
    matchedAssets: assetData?.stats.matched ?? 0,
    rootAssets: assetData?.stats.rootLevel ?? 0,
    skippedListRows: assetData?.stats.skipped_list_rows ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>TPStreams Sync Controls</CardTitle>
          <CardDescription>
            Trigger reconciliation to reflect TPStreams dashboard content in SuperAdmin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleFullSync}
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            {isSyncing && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isSyncing ? 'Syncing...' : 'Sync All TPStreams Content'}
          </Button>
          <Button
            variant="outline"
            onClick={refreshFoldersAndAssets}
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            Refresh View
          </Button>
        </CardContent>
        {syncMessage && (
          <CardFooter className="border-t pt-4">
            <div className="text-sm text-muted-foreground w-full">
              {syncMessage}
              {lastSyncTime && (
                <span className="ml-2 text-xs">
                  (Last sync: {lastSyncTime.toLocaleTimeString()})
                </span>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Stats Cards */}
      <SyncStatsCards stats={stats} />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <TabButton tab="overview" label="Overview" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton tab="folders" label="Folders" icon={<FolderOpen className="size-4 inline mr-1" />} count={folderData?.folders.length ?? 0} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton tab="assets" label="Assets" icon={<Video className="size-4 inline mr-1" />} count={assetData?.assets.length ?? 0} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton tab="root-videos" label="Root Videos" icon={<Package className="size-4 inline mr-1" />} count={assetData?.rootAssets.length ?? 0} activeTab={activeTab} onClick={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab stats={stats} syntheticBucket={syntheticBucket} />
      )}

      {activeTab === 'folders' && folderData && (
        <FoldersTab folderData={folderData} />
      )}

      {activeTab === 'assets' && assetData && (
        <AssetsTab assetData={assetData} />
      )}

      {activeTab === 'root-videos' && assetData && (
        <RootVideosTab assetData={assetData} syntheticBucket={syntheticBucket} />
      )}
    </div>
  );
}
