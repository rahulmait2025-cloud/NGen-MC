'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { loadTpUploaderScript } from '@/lib/tpstreams/uploader-client';
import type {
  TpUploaderEventData,
  TpStreamsUploaderInstance,
  TpVideoResolution,
} from '@/lib/tpstreams/types';
import type { MasterCourseModulesRow } from '@/types/database';

export type LocalUploadItem = {
  id: string;
  file: File;
  title: string;
  description: string;
  moduleId: string;
  sortOrder: number;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'registering' | 'done' | 'error';
  error?: string;
  errorType?: 'upload' | 'registration';
  tpAssetId?: string;
  resolutions: string[];
  protection: 'drm' | 'aes' | 'disable';
  generateSubtitles: boolean;
};

export type TpStreamsRegisterPayload = {
  moduleId: string;
  tpAssetId: string;
  title: string;
  description?: string;
  sortOrder: number;
  protection: 'drm' | 'aes' | 'disable';
  generateSubtitles: boolean;
  resolutions: Array<'240p' | '360p' | '480p' | '540p' | '720p' | '1080p'>;
};

type ExtendedTpStreamsUploaderInstance = TpStreamsUploaderInstance & {
  _uppy?: unknown;
  _uploaderURLs?: Record<string, unknown>;
};

function logUploaderSessionDebug(
  label: string,
  uploader: ExtendedTpStreamsUploaderInstance,
): void {
  if (process.env.NODE_ENV === 'production') return;
  const urlKeys =
    uploader._uploaderURLs && typeof uploader._uploaderURLs === 'object'
      ? Object.keys(uploader._uploaderURLs)
      : [];
  console.debug(`[tpstreams-upload] ${label}`, {
    hasUppy: Boolean(uploader._uppy),
    uploaderUrlKeys: urlKeys,
  });
}

const RESOLUTION_OPTIONS = [
  { value: '240p', label: '240p' },
  { value: '360p', label: '360p' },
  { value: '480p', label: '480p' },
  { value: '540p', label: '540p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
] as const;

const DEFAULT_RESOLUTIONS: Array<'360p' | '480p' | '720p'> = ['360p', '480p', '720p'];

const UPLOADER_READY_MAX_MS = 8000;

function generateId() {
  return crypto.randomUUID();
}

function toTitleFromFilename(filename: string) {
  return filename.replace(/\.[^/.]+$/, '');
}

function getTpUploaderErrorMessage(error: TpUploaderEventData['error']): string {
  if (!error) return 'TPStreams upload failed';
  if (typeof error === 'string') return error;
  return error.message ?? error.detail ?? error.error ?? 'TPStreams upload failed';
}

function sanitizeResolutionsForUploader(
  resolutions: string[],
): TpVideoResolution[] {
  const allowed = new Set(RESOLUTION_OPTIONS.map((r) => r.value));
  const picked = resolutions.filter((r): r is TpVideoResolution =>
    allowed.has(r as TpVideoResolution),
  );
  return picked.length > 0 ? picked : [...DEFAULT_RESOLUTIONS];
}

async function waitForUploaderReady(
  uploader: ExtendedTpStreamsUploaderInstance,
): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (uploader._uppy) {
        resolve(true);
        return;
      }
      if (Date.now() - start > UPLOADER_READY_MAX_MS) {
        resolve(false);
        return;
      }
      window.requestAnimationFrame(check);
    };
    check();
  });
}

function getStatusBadgeVariant(status: LocalUploadItem['status']) {
  switch (status) {
    case 'done':
      return 'default';
    case 'error':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getLocalStatusText(item: LocalUploadItem) {
  if (item.status === 'uploading') return `Uploading to TPStreams... ${Math.round(item.progress)}%`;
  if (item.status === 'uploaded') return 'Uploaded to TPStreams. Preparing registration...';
  if (item.status === 'registering') return 'Registering uploaded asset in app...';
  if (item.status === 'done') return 'Upload and local registration completed.';
  if (item.status === 'error' && item.errorType === 'registration') {
    return 'TP upload succeeded, but local DB registration failed.';
  }
  if (item.status === 'error') return 'TPStreams upload failed.';
  return 'Ready to upload.';
}

export interface TpStreamsLocalUploadPanelProps {
  courseId: string;
  tpFolderUuid: string | null;
  modules: MasterCourseModulesRow[];
  defaultModuleId?: string;
  cancelHref: string;
  cancelLabel?: string;
  uploadDisabled?: boolean;
  prepareFoldersOnUpload?: boolean;
  fetchUploaderToken: () => Promise<{
    ok: boolean;
    authToken?: string;
    orgId?: string;
    error?: string;
  }>;
  fetchModuleUploadConfig: (moduleId: string) => Promise<{
    ok: boolean;
    folderUuid?: string;
    error?: string;
  }>;
  registerUpload: (payload: TpStreamsRegisterPayload) => Promise<{ ok: boolean; error?: string }>;
  onUploadFinished?: () => void;
}

function UploadItemCard({
  item,
  index,
  modules,
  isLocalUploading,
  retryingItemIds,
  updateLocalUpload,
  removeLocalUpload,
  toggleItemResolution,
  retryLocalRegistration,
}: {
  item: LocalUploadItem;
  index: number;
  modules: MasterCourseModulesRow[];
  isLocalUploading: boolean;
  retryingItemIds: Set<string>;
  updateLocalUpload: <K extends keyof LocalUploadItem>(id: string, field: K, value: LocalUploadItem[K]) => void;
  removeLocalUpload: (id: string) => void;
  toggleItemResolution: (id: string, res: string) => void;
  retryLocalRegistration: (itemId: string) => void;
}) {
  return (
    <Card key={item.id} className={item.status === 'done' ? 'border-emerald-500/40 bg-emerald-500/5' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">File {index + 1}</CardTitle>
            <CardDescription className="text-xs">{item.file.name} ({(item.file.size / (1024 * 1024)).toFixed(2)} MB)</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">
              {item.status === 'uploading' ? `Uploading (${Math.round(item.progress)}%)` : item.status}
            </Badge>
            {item.status === 'pending' && (<Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeLocalUpload(item.id)}><Trash2 className="size-4" /></Button>)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={item.progress} className="h-2" />
        <Separator />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Title</Label><Input value={item.title} onChange={(e) => updateLocalUpload(item.id, 'title', e.target.value)} placeholder="Video title" disabled={isLocalUploading} /></div>
          <div className="space-y-2">
            <Label>Module</Label>
            <Select value={item.moduleId} onValueChange={(value) => updateLocalUpload(item.id, 'moduleId', value)} disabled={isLocalUploading}>
              <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
              <SelectContent>{modules.map((mod) => (<SelectItem key={mod.id} value={mod.id}>{mod.title}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <div className="space-y-4 rounded-lg border border-dashed bg-muted/20 p-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Resolutions</Label>
            <div className="flex flex-wrap gap-2">
              {RESOLUTION_OPTIONS.map((res) => { const selected = item.resolutions.includes(res.value); return (<Button key={res.value} type="button" variant={selected ? 'default' : 'outline'} size="sm" className="h-7 px-2.5 text-xs" disabled={isLocalUploading} onClick={() => toggleItemResolution(item.id, res.value)}>{res.label}</Button>); })}
            </div>
            <p className="text-xs text-muted-foreground">At least one resolution must stay selected (defaults: 360p, 480p, 720p).</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content Protection</Label>
              <Select value={item.protection} onValueChange={(v) => updateLocalUpload(item.id, 'protection', v as LocalUploadItem['protection'])} disabled={isLocalUploading}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="aes">AES Encryption</SelectItem><SelectItem value="drm">DRM (Default)</SelectItem><SelectItem value="disable">No Protection</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id={`subtitles-${item.id}`} checked={item.generateSubtitles} onCheckedChange={(v) => updateLocalUpload(item.id, 'generateSubtitles', v === true)} disabled={isLocalUploading} />
              <Label htmlFor={`subtitles-${item.id}`} className="text-xs">Auto-generate Subtitles</Label>
            </div>
          </div>
        </div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={item.description} onChange={(e) => updateLocalUpload(item.id, 'description', e.target.value)} placeholder="Brief description of the video..." maxLength={1000} disabled={isLocalUploading} /></div>
        <div className="max-w-xs space-y-2"><Label>Sort Order</Label><Input type="number" min={1} value={item.sortOrder} onChange={(e) => updateLocalUpload(item.id, 'sortOrder', Math.max(1, parseInt(e.target.value, 10) || 1))} disabled={isLocalUploading} /></div>
        <p className="text-xs text-muted-foreground">{getLocalStatusText(item)}</p>
        {item.error && <p className="text-sm text-destructive">{item.error}</p>}
        {item.status === 'error' && item.errorType === 'registration' && item.tpAssetId && (
          <Button type="button" variant="outline" size="sm" disabled={retryingItemIds.has(item.id)} onClick={() => void retryLocalRegistration(item.id)}>
            {retryingItemIds.has(item.id) ? (<><Loader2 className="size-4 mr-2 animate-spin" />Retrying...</>) : 'Retry Registration'}
          </Button>
        )}
        {item.tpAssetId && (<p className="text-xs text-muted-foreground">TP Asset ID: <span className="font-mono">{item.tpAssetId}</span></p>)}
      </CardContent>
    </Card>
  );
}

export function TpStreamsLocalUploadPanel({
  courseId,
  tpFolderUuid,
  modules,
  defaultModuleId,
  cancelHref,
  cancelLabel = 'Cancel',
  uploadDisabled = false,
  prepareFoldersOnUpload = false,
  fetchUploaderToken,
  fetchModuleUploadConfig,
  registerUpload,
  onUploadFinished,
}: TpStreamsLocalUploadPanelProps) {
  const [localUploads, setLocalUploads] = useState<LocalUploadItem[]>([]);
  const [isLocalUploading, setIsLocalUploading] = useState(false);
  const [retryingItemIds, setRetryingItemIds] = useState<Set<string>>(new Set());
  const [foldersReady, setFoldersReady] = useState(Boolean(tpFolderUuid));
  const localUploadsRef = useRef<LocalUploadItem[]>([]);

  useEffect(() => {
    localUploadsRef.current = localUploads;
  }, [localUploads]);

  useEffect(() => {
    if (tpFolderUuid) setFoldersReady(true);
  }, [tpFolderUuid]);

  const canSelectFiles = !uploadDisabled;
  const canStartUpload =
    !uploadDisabled &&
    localUploads.length > 0 &&
    (foldersReady || prepareFoldersOnUpload);

  useEffect(() => {
    if (!canSelectFiles) return;
    void loadTpUploaderScript().catch(() => {
      /* surfaced when upload starts */
    });
  }, [canSelectFiles]);

  const toggleItemResolution = (id: string, res: string) => {
    setLocalUploads((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextResolutions = item.resolutions.includes(res)
          ? item.resolutions.filter((r) => r !== res)
          : [...item.resolutions, res];
        if (nextResolutions.length === 0) return item;
        return { ...item, resolutions: nextResolutions };
      }),
    );
  };

  const handleLocalFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fallbackModule = defaultModuleId ?? modules[0]?.id ?? '';

    setLocalUploads((prev) => {
      const baseSortOrder = prev.length;
      const nextItems = Array.from(files).map((file, index) => ({
        id: generateId(),
        file,
        title: toTitleFromFilename(file.name),
        description: '',
        moduleId: fallbackModule,
        sortOrder: baseSortOrder + index + 1,
        progress: 0,
        status: 'pending' as const,
        resolutions: [...DEFAULT_RESOLUTIONS],
        protection: 'drm' as const,
        generateSubtitles: false,
      }));
      return [...prev, ...nextItems];
    });

    event.target.value = '';
  };

  const updateLocalUpload = <K extends keyof LocalUploadItem>(
    id: string,
    field: K,
    value: LocalUploadItem[K],
  ) => {
    setLocalUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeLocalUpload = (id: string) => {
    setLocalUploads((prev) => prev.filter((item) => item.id !== id));
  };

  const registerUploadedAsset = async (itemId: string, tpAssetId: string): Promise<boolean> => {
    const currentItem = localUploadsRef.current.find((item) => item.id === itemId);
    if (!currentItem) return false;

    setLocalUploads((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'registering',
              error: undefined,
              errorType: undefined,
              tpAssetId,
            }
          : item,
      ),
    );

    const result = await registerUpload({
      moduleId: currentItem.moduleId,
      tpAssetId,
      title: currentItem.title.trim(),
      description: currentItem.description.trim() || undefined,
      sortOrder: Math.max(1, currentItem.sortOrder),
      protection: currentItem.protection,
      generateSubtitles: currentItem.generateSubtitles,
      resolutions: currentItem.resolutions as TpStreamsRegisterPayload['resolutions'],
    });

    if (result.ok) {
      setLocalUploads((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: 'done', progress: 100, error: undefined, errorType: undefined }
            : item,
        ),
      );
      return true;
    }

    setLocalUploads((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'error',
              progress: 100,
              error:
                result.error ||
                'Asset registration failed: uploaded to TPStreams but not saved in app.',
              errorType: 'registration',
              tpAssetId,
            }
          : item,
      ),
    );
    return false;
  };

  const retryLocalRegistration = async (itemId: string) => {
    if (retryingItemIds.has(itemId)) return;
    const item = localUploadsRef.current.find((localItem) => localItem.id === itemId);
    if (!item?.tpAssetId) {
      toast.error('Cannot retry registration without TP asset ID');
      return;
    }

    try {
      setRetryingItemIds((prev) => new Set(prev).add(itemId));
      await registerUploadedAsset(itemId, item.tpAssetId);
      toast.success('Registration retried');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setRetryingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleLocalUploadStart = async () => {
    if (localUploads.length === 0) {
      toast.error('Select at least one local video file to upload');
      return;
    }

    if (localUploads.some((i) => !i.moduleId)) {
      toast.error('Select a module for all videos before uploading.');
      return;
    }

    if (localUploads.some((i) => i.status !== 'done' && !i.title.trim())) {
      toast.error('Enter a title for each video before uploading.');
      return;
    }

    if (localUploads.some((i) => i.status !== 'done' && i.resolutions.length === 0)) {
      toast.error('Select at least one target resolution for each video.');
      return;
    }

    setIsLocalUploading(true);
    setLocalUploads((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.status === 'done' ? 'done' : 'uploading',
        progress: item.status === 'done' ? 100 : 0,
        error: undefined,
        errorType: undefined,
      })),
    );

    try {
      const tokenResult = await fetchUploaderToken();
      if (!tokenResult.ok || !tokenResult.authToken || !tokenResult.orgId) {
        const detail = tokenResult.error || 'missing auth token or organization ID';
        throw new Error(`Uploader token: ${detail}`);
      }

      if (prepareFoldersOnUpload) {
        setFoldersReady(true);
      }

      await loadTpUploaderScript();

      if (!window.TpStreamsUploaderSDK) {
        throw new Error('TPStreams SDK: uploader script loaded but SDK class is unavailable');
      }

      const pendingItems = localUploads.filter((it) => it.status !== 'done');

      async function uploadItem(item: LocalUploadItem) {
        const configResult = await fetchModuleUploadConfig(item.moduleId);
        if (!configResult.ok || !configResult.folderUuid) {
          const configError =
            configResult.error ||
            'Module folder UUID missing — sync folders or retry upload preparation.';
          toast.error(`Module folder config failed for "${item.title}": ${configError}`);
          setLocalUploads((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'error',
                    error: `Module folder config: ${configError}`,
                    errorType: 'upload',
                  }
                : it,
            ),
          );
          return;
        }

        const folderId = configResult.folderUuid;
        const contentProtectionType = item.protection === 'disable' ? 'disabled' : item.protection;

        setLocalUploads((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'uploading', progress: 0 } : it)),
        );

        const uploader = new window.TpStreamsUploaderSDK!(
          tokenResult.authToken!,
          tokenResult.orgId!,
          {
            generateSubtitle: item.generateSubtitles,
            contentProtectionType,
            resolutions: sanitizeResolutionsForUploader(item.resolutions),
          },
        ) as ExtendedTpStreamsUploaderInstance;

        const sessionReady = await waitForUploaderReady(uploader);

        if (!sessionReady) {
          logUploaderSessionDebug('session-not-ready', uploader);
          setLocalUploads((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'error',
                    error:
                      'Upload session: TPStreams uploader did not initialize (verify TPStreams token, org ID, and SDK).',
                    errorType: 'upload',
                  }
                : it,
            ),
          );
          return;
        }

        logUploaderSessionDebug('session-ready', uploader);

        try {
          await new Promise<void>((resolve, reject) => {
            let completed = false;
            const safeResolve = () => {
              if (completed) return;
              completed = true;
              resolve();
            };
            const safeReject = (error: Error) => {
              if (completed) return;
              completed = true;
              reject(error);
            };

            uploader.on('uploadProgress', (data: unknown) => {
              const d = data as TpUploaderEventData;
              setLocalUploads((prev) =>
                prev.map((it) =>
                  it.id === item.id
                    ? {
                        ...it,
                        progress: d.progress_percentage ?? it.progress,
                        status: 'uploading',
                        tpAssetId: d.asset_id || it.tpAssetId,
                      }
                    : it,
                ),
              );
            });

            uploader.on('uploadError', (data: unknown) => {
              const d = data as TpUploaderEventData;
              safeReject(new Error(getTpUploaderErrorMessage(d.error)));
            });

            uploader.on('uploadSuccess', (data: unknown) => {
              const d = data as TpUploaderEventData;
              if (!d.asset_id) {
                safeReject(new Error('Upload succeeded but TPStreams returned no asset id'));
                return;
              }
              setLocalUploads((prev) =>
                prev.map((it) =>
                  it.id === item.id
                    ? { ...it, progress: 100, status: 'uploaded', tpAssetId: d.asset_id }
                    : it,
                ),
              );
              void registerUploadedAsset(item.id, d.asset_id).then(
                (registered) => {
                  if (registered) {
                    safeResolve();
                    return;
                  }
                  safeReject(new Error('Asset registration failed'));
                },
                (registrationError: unknown) => {
                  safeReject(
                    registrationError instanceof Error
                      ? registrationError
                      : new Error('Asset registration failed'),
                  );
                },
              );
            });

            const fileToUpload = new File([item.file], item.file.name, { type: item.file.type });
            uploader.selectFiles([fileToUpload]);

            try {
              const maybePromise = (
                uploader as unknown as { upload: (targetFolderId?: string | null) => unknown }
              ).upload(folderId);
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
        } catch (uploadError) {
          const message =
            uploadError instanceof Error ? uploadError.message : 'TPStreams upload failed';
          setLocalUploads((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'error',
                    error: message.startsWith('Upload') || message.startsWith('Module')
                      ? message
                      : `Upload session: ${message}`,
                    errorType: message.includes('registration') ? 'registration' : 'upload',
                  }
                : it,
            ),
          );
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      await Promise.allSettled(pendingItems.map((item) => uploadItem(item)));

      toast.success('Local upload process complete');
      onUploadFinished?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start local upload';
      toast.error(message);
      setLocalUploads((prev) =>
        prev.map((item) =>
          item.status === 'uploading'
            ? { ...item, status: 'error', error: message, errorType: 'upload' }
            : item,
        ),
      );
    } finally {
      setIsLocalUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Local Video Files</CardTitle>
          <CardDescription>
            Choose one or more video files from your computer. You can edit metadata for each file before upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed bg-muted/30 p-6">
            <div className="space-y-2">
              <Label htmlFor={`local-video-files-${courseId}`}>Video Files</Label>
              <Input
                id={`local-video-files-${courseId}`}
                type="file"
                accept="video/*"
                multiple
                disabled={isLocalUploading || !canSelectFiles}
                onChange={handleLocalFileSelection}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats depend on browser and source files. Selected files stay local until upload starts.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {localUploads.length} file{localUploads.length !== 1 ? 's' : ''} selected
            </span>
            <Badge variant="outline">Local Upload Queue</Badge>
          </div>
        </CardContent>
      </Card>

      {localUploads.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No local files selected yet. Add one or more files to begin TPStreams upload.
            </p>
          </CardContent>
        </Card>
      )}

      {localUploads.length > 0 && (
        <div className="space-y-4">
          {localUploads.map((item, index) => (
            <UploadItemCard
              key={item.id}
              item={item}
              index={index}
              modules={modules}
              isLocalUploading={isLocalUploading}
              retryingItemIds={retryingItemIds}
              updateLocalUpload={updateLocalUpload}
              removeLocalUpload={removeLocalUpload}
              toggleItemResolution={toggleItemResolution}
              retryLocalRegistration={retryLocalRegistration}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" asChild>
          <Link href={cancelHref}>{cancelLabel}</Link>
        </Button>
        <Button
          onClick={() => void handleLocalUploadStart()}
          disabled={isLocalUploading || !canStartUpload}
        >
          {isLocalUploading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Starting Upload...
            </>
          ) : (
            <>
              <Upload className="size-4 mr-2" />
              Start Upload
            </>
          )}
        </Button>
      </div>
    </div>
  );
}