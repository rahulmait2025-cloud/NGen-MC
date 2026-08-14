'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, Loader2, Trash2, RefreshCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  getTpUploaderTokenAction,
  registerDirectTpUploadAction,
  syncModuleFolderAssetsAction,
} from '@/app/(app)/master-courses/[courseId]/video-assets/actions';
import { getModuleUploadConfigAction } from '@/app/(app)/master-courses/actions';
import { loadTpUploaderScript } from '@/lib/tpstreams/uploader-client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  TpUploaderEventData,
  TpStreamsUploaderInstance,
  TpVideoResolution,
  TpContentProtectionType,
} from '@/lib/tpstreams/types';
import type { MasterCourseModulesRow } from '@/types/database';

type Context = 'pillar' | 'bootcamp';

type LocalUploadItem = {
  id: string;
  file: File;
  title: string;
  description: string;
  moduleId: string;
  sortOrder: number;
  progress: number;
  status: 'pending' | 'uploading' | 'registering' | 'done' | 'error';
  error?: string;
  resolutions: TpVideoResolution[];
  protection: 'drm' | 'aes' | 'disable';
  generateSubtitles: boolean;
};

const SUPPORTED_UPLOADER_RESOLUTIONS = ['240p', '360p', '480p', '720p'] as const;
type SupportedUploaderResolution = (typeof SUPPORTED_UPLOADER_RESOLUTIONS)[number];

type TpStreamsUploaderInternal = {
  _uppy?: {
    cancelAll?: () => void;
    close?: () => void;
  };
};

interface ModuleVideosClientProps {
  context?: Context;
  pillarId?: string;
  bootcampId?: string;
  courseId: string;
  moduleId: string;
  folderUuid: string | null;
  modules: MasterCourseModulesRow[];
}

function generateModuleVideoId(): string {
  return crypto.randomUUID();
}

export function ModuleVideosClient({
  context = 'pillar',
  pillarId,
  bootcampId,
  courseId,
  moduleId,
  folderUuid,
  modules,
}: ModuleVideosClientProps) {
  const tpAuthData = useRef<{ token: string; orgId: string } | null>(null);
  const [isUploaderReady, setIsUploaderReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localUploads, setLocalUploads] = useState<LocalUploadItem[]>([]);
  const [uploadUI, dispatchUploadUI] = useReducer(
    (prev: { showConfigDialog: boolean; isUploading: boolean }, action: { type: 'SET_CONFIG_DIALOG'; payload: boolean } | { type: 'SET_UPLOADING'; payload: boolean } | { type: 'RESET' }) => {
      switch (action.type) {
        case 'SET_CONFIG_DIALOG':
          return { ...prev, showConfigDialog: action.payload };
        case 'SET_UPLOADING':
          return { ...prev, isUploading: action.payload };
        case 'RESET':
          return { showConfigDialog: false, isUploading: false };
        default:
          return prev;
      }
    },
    { showConfigDialog: false, isUploading: false },
  );
  const { showConfigDialog, isUploading } = uploadUI;

  const prevModuleId = useRef(moduleId);
  if (moduleId !== prevModuleId.current) {
    setLocalUploads([]);
    dispatchUploadUI({ type: 'RESET' });
  }
  prevModuleId.current = moduleId;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const localUploadsRef = useRef<LocalUploadItem[]>([]);
  const activeUploaders = useRef<Map<string, { uploader: TpStreamsUploaderInstance; cancel: () => void }>>(new Map());
  const router = useRouter();
  const isModuleFolderReady = Boolean(folderUuid);
  const moduleOptions: typeof modules[number][] = [];
  const activeUploads: typeof localUploads[number][] = [];
  for (const item of modules) {
    if (item.tp_folder_uuid) moduleOptions.push(item);
  }
  for (const item of localUploads) {
    if (item.status === 'pending' || item.status === 'uploading' || item.status === 'registering') activeUploads.push(item);
  }

  useEffect(() => {
    localUploadsRef.current = localUploads;
  }, [localUploads]);

  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [moduleId]);

  useEffect(() => {
    if (!isUploading && activeUploads.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      // Only refresh if the page is visible to avoid background tab traffic
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, 15000); // Increased to 15s to reduce server load

    return () => window.clearInterval(intervalId);
  }, [isUploading, activeUploads.length, router]);

  // 1. Pre-load auth token and script on mount
  useEffect(() => {
    async function initRequirements() {
      try {
        const tokenResult = await getTpUploaderTokenAction();
        if (!tokenResult.ok || !tokenResult.authToken || !tokenResult.orgId) {
          throw new Error(tokenResult.error || 'Failed to get upload token');
        }

        await loadTpUploaderScript();
        tpAuthData.current = { token: tokenResult.authToken, orgId: tokenResult.orgId };
        setIsUploaderReady(true);
      } catch (err) {
        console.error('Failed to initialize uploader requirements:', err);
      }
    }
    initRequirements();
  }, []);

  useEffect(() => {
    const uploaders = activeUploaders.current;
    return () => {
      uploaders.forEach((active) => {
        try {
          active.cancel();
        } catch (err) {
          console.error('Failed to cancel active uploader on unmount:', err);
        }
      });
      uploaders.clear();
    };
  }, []);

  const getErrorMessage = useCallback((error: TpUploaderEventData['error']): string => {
    if (!error) return 'Upload failed';
    if (typeof error === 'string') return error;
    return error.message ?? error.detail ?? error.error ?? 'Upload failed';
  }, []);

  const generateId = () => generateModuleVideoId();

  const filenameToTitle = useCallback((filename: string) => filename.replace(/\.[^/.]+$/, ''), []);

  const updateItem = useCallback(<K extends keyof LocalUploadItem>(id: string, field: K, value: LocalUploadItem[K]) => {
    setLocalUploads((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    if (isUploading) return;
    setLocalUploads((prev) => prev.filter((item) => item.id !== id));
  }, [isUploading]);

  const cancelUpload = useCallback((id: string) => {
    const active = activeUploaders.current.get(id);
    if (active) {
      active.cancel();
    } else {
      setLocalUploads((prev) =>
        prev.map((existing) =>
          existing.id === id
            ? { ...existing, status: 'error', error: 'Upload canceled by user' }
            : existing
        )
      );
    }
  }, []);

  const toggleResolution = useCallback((id: string, resolution: SupportedUploaderResolution) => {
    setLocalUploads((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const exists = item.resolutions.includes(resolution);
        return {
          ...item,
          resolutions: exists ? item.resolutions.filter((res) => res !== resolution) : [...item.resolutions, resolution],
        };
      }),
    );
  }, []);

  const waitForUploaderReady = useCallback(async (uploader: TpStreamsUploaderInstance): Promise<boolean> => {
    const maxWaitMs = 5000;
    const start = Date.now();

    return await new Promise((resolve) => {
      const check = () => {
        if ((uploader as TpStreamsUploaderInstance & TpStreamsUploaderInternal)._uppy) {
          resolve(true);
          return;
        }
        if (Date.now() - start > maxWaitMs) {
          resolve(false);
          return;
        }
        window.requestAnimationFrame(check);
      };
      check();
    });
  }, []);

  const registerUploadedAsset = useCallback(async (item: LocalUploadItem, tpAssetId: string) => {
    const targetModuleId = item.moduleId || moduleId;
    setLocalUploads((prev) =>
      prev.map((existing) =>
        existing.id === item.id ? { ...existing, status: 'registering', progress: 100, error: undefined } : existing,
      ),
    );

    // Bootcamp omits pillar_id (bootcamp courses have pillar_id=null).
    // Pillar passes pillar_id so the asset is associated with the pillar's TP folder tree.
    const result = await registerDirectTpUploadAction({
      ...(context === 'pillar' && pillarId ? { pillar_id: pillarId } : {}),
      ...(context === 'bootcamp' && bootcampId ? { bootcamp_id: bootcampId } : {}),
      master_course_id: courseId,
      master_course_module_id: targetModuleId,
      module_id: targetModuleId,
      tp_asset_id: tpAssetId,
      title: item.title.trim() || filenameToTitle(item.file.name),
      description: item.description.trim() || undefined,
      sort_order: Number.isFinite(item.sortOrder) && item.sortOrder >= 1 ? item.sortOrder : 1,
      content_protection_type: item.protection,
    });

    if (!result.ok) {
      setLocalUploads((prev) =>
        prev.map((existing) =>
          existing.id === item.id
            ? { ...existing, status: 'error', error: result.error || 'Registration failed' }
            : existing,
        ),
      );
      return false;
    }

    setLocalUploads((prev) =>
      prev.map((existing) => (existing.id === item.id ? { ...existing, status: 'done', error: undefined } : existing)),
    );
    router.refresh();
    return true;
  }, [context, pillarId, bootcampId, courseId, moduleId, router, filenameToTitle]);

  const uploadSingleItem = useCallback(async (item: LocalUploadItem): Promise<void> => {
    if (!tpAuthData.current) throw new Error('Uploader token is not ready');

    const targetModuleId = item.moduleId || moduleId;
    const configResult = await getModuleUploadConfigAction(targetModuleId);
    if (!configResult.ok || !configResult.folderUuid) {
      throw new Error(configResult.error || 'Target module folder not ready');
    }

    const folderId = configResult.folderUuid;
    const globalWindow = window as unknown as {
      TpStreamsUploaderSDK?: new (
        token: string,
        org: string,
        config: {
          resolutions?: TpVideoResolution[];
          contentProtectionType?: TpContentProtectionType | 'disabled';
          generateSubtitle?: boolean;
        },
      ) => TpStreamsUploaderInstance;
    };
    const UploaderSDK = globalWindow.TpStreamsUploaderSDK;
    if (!UploaderSDK) {
      throw new Error('Uploader SDK not loaded');
    }

    const uploader = new UploaderSDK(tpAuthData.current.token, tpAuthData.current.orgId, {
        resolutions:
          item.resolutions.filter((resolution): resolution is SupportedUploaderResolution =>
            SUPPORTED_UPLOADER_RESOLUTIONS.includes(resolution as SupportedUploaderResolution),
          ).length > 0
            ? item.resolutions.filter((resolution): resolution is SupportedUploaderResolution =>
                SUPPORTED_UPLOADER_RESOLUTIONS.includes(resolution as SupportedUploaderResolution),
              )
            : ['360p', '480p', '720p'],
      contentProtectionType: item.protection === 'disable' ? 'disabled' : item.protection,
      generateSubtitle: item.generateSubtitles,
    });

    const ready = await waitForUploaderReady(uploader);
    if (!ready) {
      throw new Error('Uploader internal setup failed');
    }

    setLocalUploads((prev) =>
      prev.map((existing) =>
        existing.id === item.id ? { ...existing, status: 'uploading', progress: 0, error: undefined } : existing,
      ),
    );

    await new Promise<void>((resolve, reject) => {
      let completed = false;
      const safeResolve = () => {
        if (completed) return;
        completed = true;
        activeUploaders.current.delete(item.id);
        resolve();
      };
      const safeReject = (error: Error) => {
        if (completed) return;
        completed = true;
        activeUploaders.current.delete(item.id);
        reject(error);
      };

      activeUploaders.current.set(item.id, {
        uploader,
        cancel: () => {
          safeReject(new Error('Upload canceled by user'));
          try {
            const uppy = (uploader as TpStreamsUploaderInstance & TpStreamsUploaderInternal)._uppy;
            if (uppy) {
              if (typeof uppy.cancelAll === 'function') {
                uppy.cancelAll();
              }
              if (typeof uppy.close === 'function') {
                uppy.close();
              }
            }
          } catch (err) {
            console.error('Failed to cancel uploader:', err);
          }
        },
      });

      uploader.on('uploadProgress', (data: TpUploaderEventData) => {
        setLocalUploads((prev) =>
          prev.map((existing) =>
            existing.id === item.id
              ? { ...existing, progress: data.progress_percentage ?? existing.progress, status: 'uploading' }
              : existing,
          ),
        );
      });

      uploader.on('uploadError', (data: TpUploaderEventData) => {
        safeReject(new Error(getErrorMessage(data.error)));
      });

      uploader.on('uploadSuccess', async (data: TpUploaderEventData) => {
        if (!data.asset_id) {
          safeReject(new Error('Upload succeeded but no asset id returned'));
          return;
        }
        const current = localUploadsRef.current.find((existing) => existing.id === item.id);
        if (!current) {
          safeReject(new Error('Upload item not found'));
          return;
        }
        const registered = await registerUploadedAsset(current, data.asset_id);
        if (!registered) {
          safeReject(new Error('Uploaded, but local registration failed'));
          return;
        }
        safeResolve();
      });

      try {
        const uploadFile = new File([item.file], item.file.name, { type: item.file.type });
        uploader.selectFiles([uploadFile]);
        const maybePromise = (uploader as unknown as { upload: (targetFolderId?: string | null) => unknown }).upload(folderId);
        if (
          typeof maybePromise === 'object' &&
          maybePromise !== null &&
          'catch' in maybePromise &&
          typeof (maybePromise as { catch?: unknown }).catch === 'function'
        ) {
          (maybePromise as Promise<unknown>).catch((error: unknown) => {
            safeReject(new Error(error instanceof Error ? error.message : String(error)));
          });
        }
      } catch (error) {
        safeReject(new Error(error instanceof Error ? error.message : String(error)));
      }
    });
  }, [moduleId, registerUploadedAsset, getErrorMessage, waitForUploaderReady]);

  const handleFilesChosen = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLocalUploads((prev) => {
      const baseSort = prev.length;
      const next = Array.from(files).map((file, index) => ({
        id: generateId(),
        file,
        title: filenameToTitle(file.name),
        description: '',
        moduleId,
        sortOrder: baseSort + index + 1,
        progress: 0,
        status: 'pending' as const,
        resolutions: ['360p', '480p', '720p'] as TpVideoResolution[],
        protection: 'drm' as const,
        generateSubtitles: false,
      }));
      return [...prev, ...next];
    });

    e.target.value = '';
  }, [moduleId, filenameToTitle]);

  const startUpload = useCallback(async () => {
    if (!tpAuthData.current) {
      toast.error('Uploader auth is not ready yet');
      return;
    }
    if (localUploads.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    dispatchUploadUI({ type: 'SET_UPLOADING', payload: true });

    const pendingItems = localUploadsRef.current.filter((it) => it.status !== 'done');
    const results = await Promise.allSettled(
      pendingItems.map((item) => uploadSingleItem(item)),
    );

    let completedCount = 0;
    let failedCount = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        completedCount += 1;
      } else {
        failedCount += 1;
        const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
        const item = pendingItems[i];
        setLocalUploads((prev) =>
          prev.map((existing) =>
            existing.id === item.id ? { ...existing, status: 'error', error: message } : existing,
          ),
        );
      }
    });

    dispatchUploadUI({ type: 'SET_UPLOADING', payload: false });
    if (completedCount > 0) {
      toast.success(`${completedCount} file(s) uploaded`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} file(s) failed`);
    }
    router.refresh();
  }, [localUploads.length, router, uploadSingleItem]);

  const syncModuleAssets = useCallback(async () => {
    setIsSyncing(true);
    try {
      const formData = new FormData();
      formData.set('module_id', moduleId);
      const result = await syncModuleFolderAssetsAction(formData);

      if (!result.ok) {
        throw new Error(result.error || 'Module sync failed');
      }

      toast.success('Synced module videos from TPStreams');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync module videos');
    } finally {
      setIsSyncing(false);
    }
  }, [moduleId, router]);

  const getStatusText = useCallback((item: LocalUploadItem) => {
    if (item.status === 'uploading') return `UpLoading... ${Math.round(item.progress)}%`;
    if (item.status === 'registering') return 'Registering...';
    if (item.status === 'done') return 'Uploaded';
    if (item.status === 'error') return 'Failed';
    return 'Pending';
  }, []);

  const getStatusVariant = useCallback((item: LocalUploadItem) => {
    if (item.status === 'done') return 'default';
    if (item.status === 'error') return 'destructive';
    return 'secondary';
  }, []);

  const handleUploadDialogOpenChange = useCallback((open: boolean) => {
    dispatchUploadUI({ type: 'SET_CONFIG_DIALOG', payload: open });
    if (open) {
      setLocalUploads([]);
      dispatchUploadUI({ type: 'SET_UPLOADING', payload: false });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  return (
    <div className='space-y-3'>
      {(isUploading || activeUploads.length > 0) ? (
        <Card className='border border-primary/20 bg-primary/[0.03]'>
          <CardContent className='space-y-3 p-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2'>
                <Loader2 className='size-4 animate-spin text-primary' />
                <p className='text-sm font-medium'>Background Upload Progress</p>
              </div>
              <Badge variant='secondary'>{activeUploads.length} active</Badge>
            </div>
            <div className='space-y-2'>
              {activeUploads.slice(0, 5).map((item) => (
                <div key={item.id} className='space-y-1'>
                  <div className='flex items-center justify-between gap-2 text-xs'>
                    <span className='truncate text-muted-foreground max-w-[70%]' title={item.file.name}>{item.file.name}</span>
                    <div className='flex items-center gap-1.5'>
                      <span className='font-medium'>{getStatusText(item)}</span>
                      {(item.status === 'pending' || item.status === 'uploading' || item.status === 'registering') && (
                        <button
                          type='button'
                          onClick={() => cancelUpload(item.id)}
                          className='p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0'
                          title='Cancel upload'
                        >
                          <X className='size-3.5' />
                        </button>
                      )}
                    </div>
                  </div>
                  <Progress value={item.progress} className='h-1.5' />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className='flex items-center gap-3'>
      <Button
        variant='outline'
        onClick={syncModuleAssets}
        disabled={!isModuleFolderReady || isUploading || isSyncing}
      >
        {isSyncing ? (
          <>
            <Loader2 className='mr-2 size-4 animate-spin' />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className='mr-2 size-4' />
            Sync Videos
          </>
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleFilesChosen}
        className="hidden"
      />

      <Dialog open={showConfigDialog} onOpenChange={handleUploadDialogOpenChange}>
        <Button
          type='button'
          onClick={() => handleUploadDialogOpenChange(true)}
          disabled={!isUploaderReady || !isModuleFolderReady}
        >
          {isUploaderReady && isModuleFolderReady ? (
            <>
              <Upload className="mr-2 size-4" />
              Upload Videos
            </>
          ) : !isModuleFolderReady ? (
            <>
              <Upload className="mr-2 size-4" />
              Folder Not Ready
            </>
          ) : (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading...
            </>
          )}
        </Button>

        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-4xl'>
          <DialogHeader className='pb-4 border-b border-border/50'>
            <DialogTitle className='text-lg font-semibold'>Upload Videos</DialogTitle>
          </DialogHeader>

          <div className='space-y-5'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button type='button' variant='outline' onClick={() => fileInputRef.current?.click()} disabled={isUploading} className='h-9'>
                <Upload className='mr-2 size-4' />
                Select Video Files
              </Button>
              {localUploads.length > 0 ? (
                <Badge variant='secondary'>{localUploads.length} file(s) selected</Badge>
              ) : null}
            </div>

            {localUploads.length === 0 ? (
              <div className='rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground bg-muted/10'>
                <Upload className='size-8 mx-auto mb-3 text-muted-foreground/50' />
                <p className='font-medium'>Select one or more files to begin.</p>
                <p className='text-xs mt-1'>You can edit each file&apos;s metadata before upload.</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {localUploads.map((item) => (
                  <div key={item.id} className='rounded-xl border border-border/60 p-4 space-y-4 bg-card'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='min-w-0'>
                        <p className='font-medium truncate'>{item.file.name}</p>
                        <p className='text-xs text-muted-foreground'>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Badge variant={getStatusVariant(item)}>{getStatusText(item)}</Badge>
                        {isUploading && (item.status === 'uploading' || item.status === 'registering' || item.status === 'pending') ? (
                          <Button
                            type='button'
                            size='icon'
                            variant='ghost'
                            onClick={() => cancelUpload(item.id)}
                            className='text-muted-foreground hover:text-destructive hover:bg-destructive/5 size-8'
                            title='Cancel upload'
                          >
                            <X className='size-4' />
                          </Button>
                        ) : (
                          <Button
                            type='button'
                            size='icon'
                            variant='ghost'
                            onClick={() => removeItem(item.id)}
                            disabled={isUploading}
                            className='text-muted-foreground hover:text-destructive hover:bg-destructive/5 size-8'
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        )}
                      </div>
                    </div>

                    {(item.status === 'uploading' || item.status === 'registering' || item.status === 'done') && (
                      <Progress value={item.progress} className='h-2' />
                    )}

                    {item.error && (
                      <p className='text-xs text-destructive'>{item.error}</p>
                    )}

                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label className='text-xs font-medium text-muted-foreground'>Title</Label>
                        <Input
                          value={item.title}
                          onChange={(event) => updateItem(item.id, 'title', event.target.value)}
                          disabled={isUploading}
                          className='h-10 border-border/60 focus-visible:border-primary/40'
                        />
                      </div>

                      <div className='space-y-2'>
                        <Label className='text-xs font-medium text-muted-foreground'>Module</Label>
                        <Select
                          value={item.moduleId}
                          onValueChange={(value) => updateItem(item.id, 'moduleId', value)}
                          disabled={isUploading}
                        >
                          <SelectTrigger className='h-10 border-border/60'>
                            <SelectValue placeholder='Select module' />
                          </SelectTrigger>
                          <SelectContent>
                            {moduleOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs font-medium text-muted-foreground'>Description</Label>
                      <Textarea
                        value={item.description}
                        onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                        placeholder='Brief description of the video...'
                        disabled={isUploading}
                        className='border-border/60 focus-visible:border-primary/40 resize-none'
                        rows={2}
                      />
                    </div>

                    <div className='grid gap-4 md:grid-cols-3'>
                      <div className='space-y-2 md:col-span-2'>
                        <Label className='text-xs font-medium text-muted-foreground'>Target Resolutions</Label>
                        <div className='flex flex-wrap gap-2'>
                          {SUPPORTED_UPLOADER_RESOLUTIONS.map((resolution) => {
                            const checked = item.resolutions.includes(resolution);
                            return (
                              <Button
                                key={`${item.id}-${resolution}`}
                                type='button'
                                variant={checked ? 'default' : 'outline'}
                                size='sm'
                                onClick={() => toggleResolution(item.id, resolution)}
                                disabled={isUploading}
                                className='h-8 text-xs'
                              >
                                {resolution}
                              </Button>
                            );
                          })}
                        </div>
                        <p className='text-[11px] text-muted-foreground'>If none selected, default TPStreams resolutions are used.</p>
                      </div>

                      <div className='space-y-2'>
                        <Label className='text-xs font-medium text-muted-foreground'>Sort Order</Label>
                        <Input
                          type='number'
                          min={1}
                          value={item.sortOrder}
                          onChange={(event) => updateItem(item.id, 'sortOrder', Math.max(1, parseInt(event.target.value, 10) || 1))}
                          disabled={isUploading}
                          className='h-10 border-border/60 focus-visible:border-primary/40'
                        />
                      </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label className='text-xs font-medium text-muted-foreground'>Content Protection</Label>
                        <Select
                          value={item.protection}
                          onValueChange={(value: 'drm' | 'aes' | 'disable') => updateItem(item.id, 'protection', value)}
                          disabled={isUploading}
                        >
                          <SelectTrigger className='h-10 border-border/60'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='drm'>DRM (Default)</SelectItem>
                            <SelectItem value='aes'>AES Encryption</SelectItem>
                            <SelectItem value='disable'>Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='flex items-end'>
                        <div className='flex items-center gap-2'>
                          <Switch
                            id={`subtitles-${item.id}`}
                            checked={item.generateSubtitles}
                            onCheckedChange={(checked) => updateItem(item.id, 'generateSubtitles', checked)}
                            disabled={isUploading}
                          />
                          <Label htmlFor={`subtitles-${item.id}`} className='text-[13px] font-medium'>Auto-generate subtitles</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className='flex justify-end gap-2 pt-2 border-t border-border/50'>
              <Button
                type='button'
                variant='ghost'
                onClick={() => handleUploadDialogOpenChange(false)}
                disabled={isUploading}
                className='font-medium text-muted-foreground hover:text-foreground'
              >
                Cancel
              </Button>
              <Button
                type='button'
                onClick={startUpload}
                disabled={isUploading || localUploads.length === 0}
                className='h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/10 transition-colors rounded-lg'
              >
                {isUploading ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className='mr-2 size-4' />
                    Start Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
