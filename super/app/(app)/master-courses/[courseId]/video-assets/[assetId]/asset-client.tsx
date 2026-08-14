'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Scissors,
  Languages,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { syncVideoAssetAction } from '../actions';
import {
  generateSubtitleAction,
  uploadSubtitleAction,
  uploadThumbnailAction,
  trimVideoAction,
  revertTrimAction,
  getTrimStatusAction,
  listChaptersAction,
  addChaptersAction,
  deleteChapterAction,
} from '../enhancement-actions';
import { prepareTpStreamsThumbnailFile } from '@/lib/utils/prepare-tpstreams-thumbnail';

function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number') return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const time = [];
  if (h > 0) time.push(h);
  time.push(m.toString().padStart(2, '0'));
  time.push(s.toString().padStart(2, '0'));
  return time.join(':');
}

function AssetStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 shadow-none border border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10"><CheckCircle className="size-3 mr-1"/> Ready</Badge>;
    case 'processing': return <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 shadow-none border border-blue-500/30 dark:text-blue-400 dark:border-blue-500/20 dark:bg-blue-500/10"><RefreshCw className="size-3 mr-1 animate-spin"/> Processing</Badge>;
    case 'queued': return <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 shadow-none border border-amber-500/30 dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10"><Clock className="size-3 mr-1"/> Queued</Badge>;
    case 'error': return <Badge variant="destructive"><AlertCircle className="size-3 mr-1"/> Error</Badge>;
    default: return <Badge variant="outline">Pending</Badge>;
  }
}

import type { VideoAssetsRow } from '@/types/database';
import type { TpChapter } from '@/lib/tpstreams/types';

type AssetState = {
  isSyncing: boolean;
  isGeneratingSubs: boolean;
  trimStart: string;
  trimEnd: string;
  isTrimming: boolean;
  isCheckingTrim: boolean;
  isReverting: boolean;
  subtitleFile: File | null;
  isUploadingSub: boolean;
  thumbnailFile: File | null;
  isUploadingThumb: boolean;
  chapters: TpChapter[];
  isLoadingChapters: boolean;
  isAddingChapter: boolean;
  isDeletingChapter: number | null;
  newChapterTitle: string;
  newChapterTime: string;
};

const initialAssetState: AssetState = {
  isSyncing: false,
  isGeneratingSubs: false,
  trimStart: '',
  trimEnd: '',
  isTrimming: false,
  isCheckingTrim: false,
  isReverting: false,
  subtitleFile: null,
  isUploadingSub: false,
  thumbnailFile: null,
  isUploadingThumb: false,
  chapters: [],
  isLoadingChapters: false,
  isAddingChapter: false,
  isDeletingChapter: null,
  newChapterTitle: '',
  newChapterTime: '',
};

function assetReducer(state: AssetState, action: { type: string; payload: unknown }): AssetState {
  return { ...state, [action.type]: action.payload };
}

interface EnhancementsPanelProps {
  isGeneratingSubs: boolean;
  onGenerateSubtitles: () => void;
  handleUploadSubtitle: (e: React.FormEvent) => void;
  isUploadingSub: boolean;
  subtitleFile: File | null;
  onSubtitleFileChange: (file: File | null) => void;
  handleUploadThumbnail: (e: React.FormEvent) => void;
  isUploadingThumb: boolean;
  thumbnailFile: File | null;
  onThumbnailFileChange: (file: File | null) => void;
  chapters: TpChapter[];
  isLoadingChapters: boolean;
  onLoadChapters: () => void;
  handleAddChapter: (e: React.FormEvent) => void;
  isAddingChapter: boolean;
  isDeletingChapter: number | null;
  onDeleteChapter: (chapterId: number) => void;
  newChapterTitle: string;
  onNewChapterTitleChange: (value: string) => void;
  newChapterTime: string;
  onNewChapterTimeChange: (value: string) => void;
  trimStart: string;
  onTrimStartChange: (value: string) => void;
  trimEnd: string;
  onTrimEndChange: (value: string) => void;
  handleTrim: (e: React.FormEvent) => void;
  isTrimming: boolean;
  handleCheckTrimStatus: () => void;
  isCheckingTrim: boolean;
  handleRevertTrim: () => void;
  isReverting: boolean;
}

function EnhancementsPanel({
  isGeneratingSubs, onGenerateSubtitles, handleUploadSubtitle, isUploadingSub,
  subtitleFile, onSubtitleFileChange, handleUploadThumbnail, isUploadingThumb,
  thumbnailFile, onThumbnailFileChange, chapters, isLoadingChapters, onLoadChapters,
  handleAddChapter, isAddingChapter, isDeletingChapter, onDeleteChapter,
  newChapterTitle, onNewChapterTitleChange, newChapterTime, onNewChapterTimeChange,
  trimStart, onTrimStartChange, trimEnd, onTrimEndChange, handleTrim, isTrimming,
  handleCheckTrimStatus, isCheckingTrim, handleRevertTrim, isReverting,
}: EnhancementsPanelProps) {
  return (
    <div className="col-span-1 md:col-span-2 space-y-6">
      {/* Subtitles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Languages className="size-5 mr-3 text-muted-foreground" /> Subtitles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
            <div>
              <div className="font-medium">Auto-Generate (English)</div>
              <div className="text-xs text-muted-foreground mt-1">TPStreams will generate captions automatically.</div>
            </div>
            <Button onClick={onGenerateSubtitles} disabled={isGeneratingSubs}>
              {isGeneratingSubs ? <Loader2 className="size-4 mr-2 animate-spin" /> : 'Generate'}
            </Button>
          </div>

          <form onSubmit={handleUploadSubtitle} className="flex items-end gap-4 p-4 border rounded-lg bg-background">
            <div className="flex-1 gap-2">
              <Label>Manual Upload (.vtt only)</Label>
              <Input type="file" accept=".vtt" onChange={e => onSubtitleFileChange(e.target.files?.[0] || null)} required />
            </div>
            <Button type="submit" variant="secondary" disabled={isUploadingSub || !subtitleFile}>
              {isUploadingSub ? <Loader2 className="size-4 mr-2 animate-spin" /> : 'Upload Subtitle'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Thumbnails */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ImageIcon className="size-5 mr-3 text-muted-foreground" /> Custom Thumbnail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUploadThumbnail} className="flex items-end gap-4">
            <div className="flex-1 gap-2">
              <Label>Upload Image (JPG/PNG)</Label>
              <Input type="file" accept="image/png, image/jpeg" onChange={e => onThumbnailFileChange(e.target.files?.[0] || null)} required />
            </div>
            <Button type="submit" variant="secondary" disabled={isUploadingThumb || !thumbnailFile}>
              {isUploadingThumb ? <Loader2 className="size-4 mr-2 animate-spin" /> : 'Apply Thumbnail'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Chapters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center"><Clock className="size-5 mr-3 text-muted-foreground" /> Chapters</div>
            <Button variant="outline" size="sm" onClick={onLoadChapters} disabled={isLoadingChapters}>
              {isLoadingChapters ? <Loader2 className="size-4 animate-spin" /> : 'Load Chapters'}
            </Button>
          </CardTitle>
        </CardHeader>
        {chapters.length > 0 && (
          <CardContent className="space-y-2">
            {chapters.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                <div>
                  <span className="font-mono text-sm bg-background px-2 py-1 rounded border mr-3">{c.start_time}</span>
                  <span className="font-medium text-sm">{c.title}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={() => onDeleteChapter(c.id)} disabled={isDeletingChapter === c.id}>
                  {isDeletingChapter === c.id ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            ))}
          </CardContent>
        )}
        <CardContent className="pt-0">
          <form onSubmit={handleAddChapter} className="flex items-end gap-3 p-4 border rounded-lg bg-background mt-2">
            <div className="flex-1 gap-2">
              <Label>Timestamp (HH:MM:SS)</Label>
              <Input placeholder="00:01:30" value={newChapterTime} onChange={e => onNewChapterTimeChange(e.target.value)} required />
            </div>
            <div className="flex-[2] gap-2">
              <Label>Chapter Title</Label>
              <Input placeholder="Introduction" value={newChapterTitle} onChange={e => onNewChapterTitleChange(e.target.value)} required />
            </div>
            <Button type="submit" variant="secondary" disabled={isAddingChapter || !newChapterTime || !newChapterTitle}>
              {isAddingChapter ? <Loader2 className="size-4 animate-spin" /> : 'Add Chapter'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Trimming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-destructive">
            <Scissors className="size-5 mr-3" /> Video Trimming
          </CardTitle>
          <CardDescription>
            Trimming permanently removes portions from the beginning or end. This triggers an asynchronous re-processing job.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleTrim} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-stretch sm:items-end">
            <div className="space-y-2">
              <Label>Start Time (seconds)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 5.5" value={trimStart} onChange={e => onTrimStartChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time (seconds)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 120.5" value={trimEnd} onChange={e => onTrimEndChange(e.target.value)} />
            </div>
            <Button type="submit" disabled={isTrimming} variant="destructive">
              {isTrimming ? <Loader2 className="size-4 mr-2 animate-spin" /> : 'Queue Trim'}
            </Button>
          </form>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={handleCheckTrimStatus} disabled={isCheckingTrim} variant="outline" size="sm">
              {isCheckingTrim && <Loader2 className="size-3 mr-2 animate-spin" />} Check Status
            </Button>
            <Button onClick={handleRevertTrim} disabled={isReverting} variant="outline" size="sm" className="text-destructive">
              {isReverting && <Loader2 className="size-3 mr-2 animate-spin" />} Revert Trim
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AssetEnhancementClient({ courseId, asset }: { courseId: string; asset: VideoAssetsRow }) {
  const { refresh } = useRouter();
  const [s, d] = useReducer(assetReducer, initialAssetState);
  const {
    isSyncing, isGeneratingSubs, trimStart, trimEnd, isTrimming, isCheckingTrim, isReverting,
    subtitleFile, isUploadingSub, thumbnailFile, isUploadingThumb,
    chapters, isLoadingChapters, isAddingChapter, isDeletingChapter, newChapterTitle, newChapterTime,
  } = s;

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    d({ type: 'isSyncing', payload: true });
    const fd = new FormData();
    fd.append('asset_id', asset.id);
    const res = await syncVideoAssetAction(fd);
    d({ type: 'isSyncing', payload: false });
    if (res.ok) {
        toast.success('Successfully synced TPStreams metadata');
        refresh();
    } else {
        toast.error(res.error || 'Failed to sync');
    }
  };

  const handleGenerateSubtitles = async () => {
    if (!confirm('This will trigger auto-caption generation (billed at $0.071/min). Continue?')) return;
    d({ type: 'isGeneratingSubs', payload: true });
    const fd = new FormData();
    fd.append('asset_id', asset.id);
    const res = await generateSubtitleAction(fd);
    d({ type: 'isGeneratingSubs', payload: false });
    if (res.ok) {
        toast.success('Subtitle generation started');
        refresh();
    } else {
        toast.error(res.error || 'Failed to start subtitle generation');
    }
  };

  const handleUploadSubtitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtitleFile) return toast.error('Select a .vtt file');
    d({ type: 'isUploadingSub', payload: true });
    const fd = new FormData();
    fd.append('asset_id', asset.id);
    fd.append('file', subtitleFile);
    fd.append('lang', 'en');
    const res = await uploadSubtitleAction(fd);
    d({ type: 'isUploadingSub', payload: false });
    if (res.ok) {
        toast.success('Subtitle uploaded successfully');
        d({ type: 'subtitleFile', payload: null });
    } else {
        toast.error(res.error || 'Upload failed');
    }
  };

  const handleUploadThumbnail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thumbnailFile) return toast.error('Select an image file');
    d({ type: 'isUploadingThumb', payload: true });
    try {
      const tpFile = await prepareTpStreamsThumbnailFile(thumbnailFile);
      const fd = new FormData();
      fd.append('asset_id', asset.id);
      fd.append('file', tpFile);
      const res = await uploadThumbnailAction(fd);
      if (res.ok) {
        toast.success('Thumbnail uploaded and processing');
        d({ type: 'thumbnailFile', payload: null });
        refresh();
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      d({ type: 'isUploadingThumb', payload: false });
    }
  };

  const handleTrim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimStart && !trimEnd) return toast.error('Specify a start or end point');
    d({ type: 'isTrimming', payload: true });
    const fd = new FormData();
    fd.append('asset_id', asset.id);
    if (trimStart) fd.append('start_time', trimStart);
    if (trimEnd) fd.append('end_time', trimEnd);
    const res = await trimVideoAction(fd);
    d({ type: 'isTrimming', payload: false });
    if (res.ok) {
        toast.success('Trim job queued! Check status periodically.');
        refresh();
    } else {
        toast.error(res.error || 'Trim initialization failed');
    }
  };

  const handleCheckTrimStatus = async () => {
    d({ type: 'isCheckingTrim', payload: true });
    const res = await getTrimStatusAction(asset.id);
    d({ type: 'isCheckingTrim', payload: false });
    if (res.ok) {
        const trm = res.data as { status?: string } | null;
        toast.info(`Current trim status: ${trm?.status || 'Unknown'}`);
    } else {
        toast.error(res.error || 'Could not fetch status');
    }
  };

  const handleRevertTrim = async () => {
    if (!confirm('Revert video to the original un-trimmed version? This will queue a processing job.')) return;
    d({ type: 'isReverting', payload: true });
    const fd = new FormData();
    fd.append('asset_id', asset.id);
    const res = await revertTrimAction(fd);
    d({ type: 'isReverting', payload: false });
    if (res.ok) {
        toast.success('Revert trim job queued');
        refresh();
    } else {
        toast.error(res.error || 'Failed to revert trim');
    }
  };

  const handleLoadChapters = async () => {
    d({ type: 'isLoadingChapters', payload: true });
    const res = await listChaptersAction(asset.id);
    d({ type: 'isLoadingChapters', payload: false });
    if (res.ok && res.data) {
        d({ type: 'chapters', payload: (res.data as { results: TpChapter[] }).results || [] });
    } else {
        toast.error(res.error || 'Failed to load chapters');
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle || !newChapterTime) return toast.error('Title and HH:MM:SS time required');
    if (!/^\d{2}:\d{2}:\d{2}$/.test(newChapterTime)) return toast.error('Time must be HH:MM:SS format');
    
    d({ type: 'isAddingChapter', payload: true });
    const fd = new FormData();
    fd.append('asset_id', asset.id);
    const currentChaptersInput = chapters.map(c => ({ title: c.title, start_time: c.start_time }));
    currentChaptersInput.push({ title: newChapterTitle, start_time: newChapterTime });
    fd.append('chapters', JSON.stringify(currentChaptersInput));

    const res = await addChaptersAction(fd);
    d({ type: 'isAddingChapter', payload: false });
    if (res.ok) {
        toast.success('Chapter added');
        d({ type: 'newChapterTitle', payload: '' });
        d({ type: 'newChapterTime', payload: '' });
        handleLoadChapters();
    } else {
        toast.error(res.error || 'Failed to add chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: number) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;
    d({ type: 'isDeletingChapter', payload: chapterId });
    const fd = new FormData();
    fd.append('asset_id', asset.id);
    fd.append('chapter_id', chapterId.toString());

    const res = await deleteChapterAction(fd);
    d({ type: 'isDeletingChapter', payload: null });
    if (res.ok) {
        toast.success('Chapter deleted');
        d({ type: 'chapters', payload: chapters.filter(c => c.id !== chapterId) });
    } else {
        toast.error(res.error || 'Failed to delete chapter');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href={`/master-courses/${courseId}/video-assets`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Enhance Asset</h1>
            <p className="text-sm text-muted-foreground font-mono">{asset.tp_asset_id}</p>
          </div>
        </div>
        <Button onClick={handleSync} disabled={isSyncing} variant="secondary">
          {isSyncing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
          Sync with TPStreams
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Metadata & Previews */}
        <div className="space-y-6 col-span-1 border-r pr-6 border-dashed">
            
            <div className="space-y-4">
                <div className="font-semibold">{asset.title}</div>
                {asset.description && <p className="text-sm text-muted-foreground">{asset.description}</p>}
                
                <div className="bg-muted p-4 rounded-lg space-y-3">
                   <div className="flex items-center justify-between">
                       <span className="text-sm text-muted-foreground">Status</span>
                       <AssetStatusBadge status={asset.processing_status} />
                   </div>
                   <div className="flex items-center justify-between">
                       <span className="text-sm text-muted-foreground">Duration</span>
                       <span className="font-mono text-sm">{formatDuration(asset.duration_seconds)}</span>
                   </div>
                   <div className="flex items-center justify-between">
                       <span className="text-sm text-muted-foreground">Protection</span>
                       <Badge variant="outline" className="uppercase text-[10px]">{asset.content_protection_type || 'N/A'}</Badge>
                   </div>
                </div>

                {asset.thumbnail_url ? (
                    <div className="rounded-lg overflow-hidden border">
                        <Image
                          src={asset.thumbnail_url}
                          alt="Thumbnail preview"
                          width={640}
                          height={360}
                          className="w-full object-cover"
                          loading="lazy"
                        />
                    </div>
                ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center border-dashed border-2">
                        <span className="text-muted-foreground text-sm flex items-center"><ImageIcon className="size-4 mr-2" /> No Thumbnail</span>
                    </div>
                )}
                
                {asset.playback_url && (
                    <Button asChild className="w-full" variant="outline">
                        <a href={asset.playback_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4 mr-2" /> Watch Master
                        </a>
                    </Button>
                )}
            </div>

        </div>

        {/* Right Column: Enhancements */}
        <EnhancementsPanel
          isGeneratingSubs={isGeneratingSubs}
          onGenerateSubtitles={handleGenerateSubtitles}
          handleUploadSubtitle={handleUploadSubtitle}
          isUploadingSub={isUploadingSub}
          subtitleFile={subtitleFile}
          onSubtitleFileChange={(file) => d({ type: 'subtitleFile', payload: file })}
          handleUploadThumbnail={handleUploadThumbnail}
          isUploadingThumb={isUploadingThumb}
          thumbnailFile={thumbnailFile}
          onThumbnailFileChange={(file) => d({ type: 'thumbnailFile', payload: file })}
          chapters={chapters}
          isLoadingChapters={isLoadingChapters}
          onLoadChapters={handleLoadChapters}
          handleAddChapter={handleAddChapter}
          isAddingChapter={isAddingChapter}
          isDeletingChapter={isDeletingChapter}
          onDeleteChapter={handleDeleteChapter}
          newChapterTitle={newChapterTitle}
          onNewChapterTitleChange={(value) => d({ type: 'newChapterTitle', payload: value })}
          newChapterTime={newChapterTime}
          onNewChapterTimeChange={(value) => d({ type: 'newChapterTime', payload: value })}
          trimStart={trimStart}
          onTrimStartChange={(value) => d({ type: 'trimStart', payload: value })}
          trimEnd={trimEnd}
          onTrimEndChange={(value) => d({ type: 'trimEnd', payload: value })}
          handleTrim={handleTrim}
          isTrimming={isTrimming}
          handleCheckTrimStatus={handleCheckTrimStatus}
          isCheckingTrim={isCheckingTrim}
          handleRevertTrim={handleRevertTrim}
          isReverting={isReverting}
        />
      </div>
    </div>
  );
}
