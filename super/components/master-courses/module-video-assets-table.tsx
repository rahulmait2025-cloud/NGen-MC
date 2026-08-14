  'use client';

  import { useEffect, useMemo, useRef, useState, useReducer, useCallback } from 'react';
  import Image from 'next/image';
  import { useRouter } from 'next/navigation';
  import { toast } from 'sonner';
  import {
    CheckCircle2,
    Clock,
    ImageUp,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    AlertCircle,
    Edit2,
    FileText,
  } from 'lucide-react';

  import { Input } from '@/components/ui/input';
  import { Button } from '@/components/ui/button';
  import { Badge } from '@/components/ui/badge';
  import { Label } from '@/components/ui/label';
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
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
  import {
    deleteVideoAssetAction,
    syncVideoAssetAction,
    updateVideoAssetMetadataAction,
  } from '@/app/(app)/master-courses/[courseId]/video-assets/actions';
  import { uploadThumbnailAction } from '@/app/(app)/master-courses/[courseId]/video-assets/enhancement-actions';
  import { prepareTpStreamsThumbnailFile } from '@/lib/utils/prepare-tpstreams-thumbnail';

  type Context = 'pillar' | 'bootcamp';

  type ModuleVideo = {
    id: string;
    tp_asset_id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    updated_at: string;
    processing_status: 'pending' | 'queued' | 'processing' | 'completed' | 'error';
    duration_seconds: number | null;
    created_at: string;
    resolutions: string[] | null;
    sort_order: number;
  };

  interface ModuleVideoAssetsTableProps {
    context?: Context;
    bootcampId?: string;
    videos: ModuleVideo[];
    /** Resource titles attached to each video asset (keyed by video asset id). */
    linkedResourcesByVideoId?: Record<string, string[]>;
  }

  type RowActionState = {
    syncing: boolean;
    deleting: boolean;
    uploadingThumb: boolean;
  };

  const defaultActionState: RowActionState = {
    syncing: false,
    deleting: false,
    uploadingThumb: false,
  };

  function formatDuration(seconds: number | null): string {
    if (!seconds || seconds <= 0) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  function formatCreatedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function withCacheBuster(url: string, version: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(version)}`;
  }

  function StatusBadge({ status }: { status: ModuleVideo['processing_status'] }) {
    if (status === 'completed') {
      return (
        <Badge variant='outline' className='border-emerald-200 bg-emerald-50 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
          <CheckCircle2 className='mr-1 size-3' />
          Completed
        </Badge>
      );
    }
    if (status === 'error') {
      return (
        <Badge variant='outline' className='border-destructive/30 bg-destructive/10 text-destructive'>
          <AlertCircle className='mr-1 size-3' />
          Error
        </Badge>
      );
    }
    return (
      <Badge variant='outline' className='border-amber-200 bg-amber-50 text-amber-700 dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10'>
        <Clock className='mr-1 size-3' />
        {status === 'queued' ? 'Queued' : 'Pending'}
      </Badge>
    );
  }

  type DeleteConfirmState = { id: string | null; title: string };
  type DeleteConfirmAction =
    | { type: 'CONFIRM'; id: string; title: string }
    | { type: 'CANCEL' };

  function deleteConfirmReducer(state: DeleteConfirmState, action: DeleteConfirmAction): DeleteConfirmState {
    switch (action.type) {
      case 'CONFIRM': return { id: action.id, title: action.title };
      case 'CANCEL': return { id: null, title: '' };
    }
  }

  interface VideoAssetsTableContentProps {
    filtered: ModuleVideo[];
    rowState: Record<string, RowActionState>;
    fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
    syncAsset: (id: string, silent?: boolean) => Promise<void>;
    uploadThumb: (id: string, file: File | null) => Promise<void>;
    dispatchDeleteConfirm: React.Dispatch<DeleteConfirmAction>;
    onRenameClick: (id: string, title: string, description: string | null, sort_order: number) => void;
    linkedResourcesByVideoId?: Record<string, string[]>;
  }

  function VideoAssetsTableContent({
    filtered, rowState, fileInputRefs, syncAsset, uploadThumb, dispatchDeleteConfirm, onRenameClick, linkedResourcesByVideoId,
  }: VideoAssetsTableContentProps) {
    if (filtered.length === 0) {
      return (
        <div className='overflow-x-auto rounded-lg border border-border/60'>
          <Table className='w-full text-sm table-fixed'>
            <colgroup>
              <col className="w-14" />
              <col className="w-24" />
              <col className="w-auto" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-44" />
              <col className="w-28" />
            </colgroup>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>#</TableHead>
                <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Thumbnail</TableHead>
                <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Title</TableHead>
                <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Status</TableHead>
                <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Duration</TableHead>
                <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Created At</TableHead>
                <TableHead className='h-10 px-4 text-right font-medium text-muted-foreground'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className='px-4 py-12 text-center text-muted-foreground'>
                  No assets match the current filters.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <div className='overflow-x-auto rounded-lg border border-border/60'>
        <Table className='w-full text-sm table-fixed'>
          <colgroup>
            <col className="w-14" />
            <col className="w-24" />
            <col className="w-auto" />
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-44" />
            <col className="w-28" />
          </colgroup>
          <TableHeader className='bg-muted/30'>
            <TableRow>
              <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>#</TableHead>
              <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Thumbnail</TableHead>
              <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Title</TableHead>
              <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Status</TableHead>
              <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Duration</TableHead>
              <TableHead className='h-10 px-4 text-left font-medium text-muted-foreground'>Created At</TableHead>
              <TableHead className='h-10 px-4 text-right font-medium text-muted-foreground'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((video) => {
              const state = rowState[video.id] ?? defaultActionState;
              const isBusy = state.syncing || state.deleting || state.uploadingThumb;

              return (
                <TableRow key={video.id} className='border-t border-border/50 group hover:bg-muted/5'>
                  <TableCell className='px-4 py-3 font-mono text-xs text-muted-foreground font-semibold'>{Math.max(1, video.sort_order ?? 1)}</TableCell>
                  <TableCell className='px-4 py-3'>
                    <div className='relative h-12 w-20 overflow-hidden rounded-md bg-muted border border-border/40'>
                      {video.thumbnail_url ? (
                        <Image
                          src={withCacheBuster(video.thumbnail_url, video.updated_at || video.created_at)}
                          alt={video.title}
                          fill
                          sizes="80px"
                          className='object-cover'
                          unoptimized
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center text-xs text-muted-foreground'>No image</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='px-4 py-3 min-w-0'>
                    <div className='flex items-center gap-2 group/title min-w-0'>
                      <span className='font-medium truncate block text-foreground' title={video.title}>{video.title}</span>
                      <button
                        type='button'
                        onClick={() => onRenameClick(video.id, video.title, video.description, video.sort_order)}
                        className='text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/title:opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 outline-none shrink-0'
                        aria-label={`Edit details for ${video.title}`}
                      >
                        <Edit2 className='size-3.5' />
                      </button>
                    </div>
                    <div className='font-mono text-xs text-muted-foreground/60 truncate mt-0.5'>{video.tp_asset_id}</div>
                    {(linkedResourcesByVideoId?.[video.id]?.length ?? 0) > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {linkedResourcesByVideoId![video.id].map((title) => (
                          <span
                            key={`${video.id}-${title}`}
                            className="inline-flex max-w-full items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                            title={`Linked resource: ${title}`}
                          >
                            <FileText className="size-3 shrink-0" aria-hidden />
                            <span className="truncate">{title}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {video.description ? (
                      <div className='text-xs text-muted-foreground/80 mt-1 line-clamp-2 whitespace-pre-line truncate'>
                        {video.description}
                      </div>
                    ) : (
                      <div className='text-xs text-muted-foreground/30 italic mt-1'>No description</div>
                    )}
                  </TableCell>
                  <TableCell className='px-4 py-3 whitespace-nowrap'>
                    <StatusBadge status={video.processing_status} />
                  </TableCell>
                  <TableCell className='px-4 py-3 font-medium whitespace-nowrap'>{formatDuration(video.duration_seconds)}</TableCell>
                  <TableCell className='px-4 py-3 text-muted-foreground text-xs whitespace-nowrap'>{formatCreatedAt(video.created_at)}</TableCell>
                  <TableCell className='px-4 py-3'>
                    <div className='flex justify-end gap-2'>
                      <input
                        ref={(el) => { fileInputRefs.current[video.id] = el; }}
                        type='file'
                        accept='image/png,image/jpeg,image/jpg'
                        className='hidden'
                        onChange={(event) => { void uploadThumb(video.id, event.target.files?.[0] ?? null); event.currentTarget.value = ''; }}
                        aria-label={`Upload thumbnail for video ${video.id}`}
                      />
                      <Button variant='outline' size='sm' onClick={() => void syncAsset(video.id)} disabled={isBusy} className='h-8 w-8 p-0'>
                        {state.syncing ? <Loader2 className='size-3.5 animate-spin' /> : <RefreshCw className='size-3.5' />}
                      </Button>
                      <Button variant='outline' size='sm' onClick={() => fileInputRefs.current[video.id]?.click()} disabled={isBusy} className='h-8 w-8 p-0'>
                        {state.uploadingThumb ? <Loader2 className='size-3.5 animate-spin' /> : <ImageUp className='size-3.5' />}
                      </Button>
                      <Button variant='outline' size='sm' className='h-8 w-8 p-0 text-destructive hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30' onClick={() => dispatchDeleteConfirm({ type: 'CONFIRM', id: video.id, title: video.title })} disabled={isBusy}>
                        {state.deleting ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
}

export function ModuleVideoAssetsTable({
  context: _context = 'pillar',
  bootcampId: _bootcampId,
  videos,
  linkedResourcesByVideoId,
}: ModuleVideoAssetsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ModuleVideo['processing_status']>('all');
  const [rowState, setRowState] = useState<Record<string, RowActionState>>({});
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [deleteConfirm, dispatchDeleteConfirm] = useReducer(deleteConfirmReducer, { id: null, title: '' } as DeleteConfirmState);
  const [editingVideo, setEditingVideo] = useState<{ id: string; title: string; description: string | null; sort_order: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const isSyncingRef = useRef(false);

  const handleRenameSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingVideo) return;
    const trimmedTitle = editingVideo.title.trim();
    if (!trimmedTitle) {
      toast.error('Video title cannot be empty');
      return;
    }

    setIsRenaming(true);
    try {
      const formData = new FormData();
      formData.set('asset_id', editingVideo.id);
      formData.set('title', trimmedTitle);
      formData.set('description', editingVideo.description || '');
      formData.set('sort_order', String(editingVideo.sort_order));

      const result = await updateVideoAssetMetadataAction(formData);
      if (!result.ok) {
        throw new Error(result.error || 'Failed to update video details');
      }

      toast.success('Video details updated');
      setEditingVideo(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update video details');
    } finally {
      setIsRenaming(false);
    }
  };

  const setActionState = useCallback((videoId: string, patch: Partial<RowActionState>) => {
    setRowState((prev) => ({
      ...prev,
      [videoId]: {
        ...(prev[videoId] ?? defaultActionState),
        ...patch,
      },
    }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((video) => {
      const matchesText =
        q.length === 0 ||
        video.title.toLowerCase().includes(q) ||
        video.tp_asset_id.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || video.processing_status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [videos, query, statusFilter]);

  const syncAsset = useCallback(async (assetId: string, silent = false) => {
    setActionState(assetId, { syncing: true });
    try {
      const formData = new FormData();
      formData.set('asset_id', assetId);
      const result = await syncVideoAssetAction(formData);
      if (!result.ok) {
        throw new Error(result.error || 'Failed to sync video status');
      }
      if (!silent) toast.success('Status synced from TPStreams');
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Failed to sync video status');
      }
    } finally {
      setActionState(assetId, { syncing: false });
    }
  }, [setActionState]);

  const deleteAsset = async (assetId: string) => {
    dispatchDeleteConfirm({ type: 'CANCEL' });
    setActionState(assetId, { deleting: true });
    try {
      const formData = new FormData();
      formData.set('asset_id', assetId);
      const result = await deleteVideoAssetAction(formData);
      if (!result.ok) {
        throw new Error(result.error || 'Failed to delete asset');
      }
      toast.success('Video deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete asset');
    } finally {
      setActionState(assetId, { deleting: false });
    }
  };

  const uploadThumb = async (assetId: string, file: File | null) => {
    if (!file) return;

    const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Thumbnail must be PNG, JPEG, or WebP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Thumbnail must be less than 2MB');
      return;
    }

    setActionState(assetId, { uploadingThumb: true });
    try {
      const tpFile = await prepareTpStreamsThumbnailFile(file);
      const formData = new FormData();
      formData.set('asset_id', assetId);
      formData.set('file', tpFile);
      const result = await uploadThumbnailAction(formData);
      if (!result.ok) {
        throw new Error(result.error || 'Failed to upload thumbnail');
      }
      toast.success('Thumbnail updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload thumbnail');
    } finally {
      setActionState(assetId, { uploadingThumb: false });
    }
  };

  useEffect(() => {
    const pending = videos.filter((video) =>
      ['pending', 'queued', 'processing'].includes(video.processing_status),
    );
    if (pending.length === 0) return;

    const timer = window.setInterval(async () => {
      // 1. Skip if tab/page is not visible to prevent background polling spam
      if (document.visibilityState !== 'visible') {
        return;
      }

      // 2. Prevent concurrent overlaps if a sync is already running
      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      setIsBackgroundSyncing(true);

      try {
        let hasAnyChange = false;
        // Sync sequentially (one by one) to prevent parallel GoTrue refresh race conditions
        for (const video of pending.slice(0, 3)) {
          try {
            const formData = new FormData();
            formData.set('asset_id', video.id);
            const result = await syncVideoAssetAction(formData);
            if (result.ok && result.data?.changed) {
              hasAnyChange = true;
            }
          } catch (err) {
            console.error(`[video-assets-table] Failed background sync for ${video.id}:`, err);
          }
        }

        // Only call router.refresh() if at least one asset actually updated state
        if (hasAnyChange) {
          router.refresh();
        }
      } finally {
        setIsBackgroundSyncing(false);
        isSyncingRef.current = false;
      }
    }, 20000);

    return () => window.clearInterval(timer);
  }, [videos, router]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='relative w-full md:max-w-xl'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search assets by title...'
            className='pl-9 border-border/60 focus-visible:border-primary/40'
          />
        </div>
        <div className='flex items-center gap-2'>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className='w-[160px] border-border/60'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Statuses</SelectItem>
              <SelectItem value='completed'>Completed</SelectItem>
              <SelectItem value='processing'>Processing</SelectItem>
              <SelectItem value='queued'>Queued</SelectItem>
              <SelectItem value='pending'>Pending</SelectItem>
              <SelectItem value='error'>Error</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant='secondary'>{filtered.length} Assets</Badge>
        </div>
      </div>

      {isBackgroundSyncing && (
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <Loader2 className='size-3.5 animate-spin' />
          Syncing TPStreams status...
        </div>
      )}

      <VideoAssetsTableContent
        filtered={filtered}
        rowState={rowState}
        fileInputRefs={fileInputRefs}
        syncAsset={syncAsset}
        uploadThumb={uploadThumb}
        dispatchDeleteConfirm={dispatchDeleteConfirm}
        linkedResourcesByVideoId={linkedResourcesByVideoId}
        onRenameClick={(id, title, description, sort_order) => setEditingVideo({ id, title, description, sort_order: Math.max(1, sort_order ?? 1) })}
      />

      <p className='text-[11px] text-muted-foreground'>
        Actions: rename asset, sync status from TPStreams, upload a custom thumbnail, or delete an asset.
      </p>
      <p className='text-[11px] text-muted-foreground'>
        Thumbnail upload supports PNG/JPG/WEBP. For best results, use 1280x720 (16:9), under 2 MB.
      </p>

      <AlertDialog open={!!deleteConfirm.id} onOpenChange={() => dispatchDeleteConfirm({ type: 'CANCEL' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteConfirm.title}&quot; from TPStreams and local records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm.id && void deleteAsset(deleteConfirm.id)}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
        <DialogContent className='sm:max-w-[500px]'>
          <form onSubmit={handleRenameSave}>
            <DialogHeader>
              <DialogTitle>Edit Video Details</DialogTitle>
              <DialogDescription>
                Update the display title and description of this video asset. These changes will be visible to students in the course player.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='video-title' className='font-semibold'>Video Title</Label>
                <Input
                  id='video-title'
                  value={editingVideo?.title ?? ''}
                  onChange={(e) => setEditingVideo((prev) => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder='Enter video title'
                  disabled={isRenaming}
                  required
                  autoFocus
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='video-description' className='font-semibold'>Description</Label>
                <textarea
                  id='video-description'
                  value={editingVideo?.description ?? ''}
                  onChange={(e) => setEditingVideo((prev) => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder='Enter video description...'
                  disabled={isRenaming}
                  className='min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='video-sort-order' className='font-semibold'>Sort Order</Label>
                <Input
                  id='video-sort-order'
                  type='number'
                  min={1}
                  value={Math.max(1, editingVideo?.sort_order ?? 1)}
                  onChange={(e) => setEditingVideo((prev) => prev ? { ...prev, sort_order: Math.max(1, parseInt(e.target.value) || 1) } : null)}
                  placeholder='Enter sort order'
                  disabled={isRenaming}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setEditingVideo(null)} disabled={isRenaming}>
                Cancel
              </Button>
              <Button type='submit' disabled={isRenaming}>
                {isRenaming && <Loader2 className='mr-2 size-4 animate-spin' />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
