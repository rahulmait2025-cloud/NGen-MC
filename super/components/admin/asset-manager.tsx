'use client';

import { useState, useMemo, useEffect, useReducer, useCallback } from 'react';
import Image from 'next/image';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  Play,
  FileJson,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Subtitles,
  Image as ImageIcon,
  Scissors,
  ListOrdered,
  Plus,
  Trash,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

import type { VideoAssetsRow, VideoAssetProcessingStatus } from '@/types/database';
import { formatDuration } from '@/lib/utils';
import { deleteVideoAssetAction, syncVideoAssetAction } from '@/app/(app)/master-courses/[courseId]/video-assets/actions';
import { 
  generateSubtitleAction, 
  uploadSubtitleAction, 
  uploadThumbnailAction, 
  trimVideoAction, 
  getTrimStatusAction, 
  revertTrimAction, 
  listChaptersAction, 
  addChaptersAction, 
  deleteChapterAction 
} from '@/app/(app)/master-courses/[courseId]/video-assets/enhancement-actions';
import { prepareTpStreamsThumbnailFile } from '@/lib/utils/prepare-tpstreams-thumbnail';

interface AssetManagerProps {
  assets: VideoAssetsRow[];
  onRefresh: () => void;
}

interface TrimStatus {
  status: string;
  status_display?: string;
  start_time: number;
  end_time: number;
  background_task_id: string;
}

type AssetActionState = {
  syncingAssetId: string | null;
  deletingAssetId: string | null;
  loadingEnhancements: boolean;
  actionPending: boolean;
};
type AssetActionType =
  | { type: 'SYNC_START'; assetId: string }
  | { type: 'SYNC_END' }
  | { type: 'DELETE_START'; assetId: string }
  | { type: 'DELETE_END' }
  | { type: 'LOAD_ENHANCEMENTS_START' }
  | { type: 'LOAD_ENHANCEMENTS_END' }
  | { type: 'ACTION_START' }
  | { type: 'ACTION_END' };

function assetActionReducer(state: AssetActionState, action: AssetActionType): AssetActionState {
  switch (action.type) {
    case 'SYNC_START': return { ...state, syncingAssetId: action.assetId };
    case 'SYNC_END': return { ...state, syncingAssetId: null };
    case 'DELETE_START': return { ...state, deletingAssetId: action.assetId };
    case 'DELETE_END': return { ...state, deletingAssetId: null };
    case 'LOAD_ENHANCEMENTS_START': return { ...state, loadingEnhancements: true };
    case 'LOAD_ENHANCEMENTS_END': return { ...state, loadingEnhancements: false };
    case 'ACTION_START': return { ...state, actionPending: true };
    case 'ACTION_END': return { ...state, actionPending: false };
  }
}

interface AssetSheetTabsProps {
  asset: VideoAssetsRow;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSyncing: string | null;
  isLoadingEnhancements: boolean;
  isActionPending: boolean;
  chapters: { id: number; title: string; start_time: string }[];
  newChapter: { title: string; start_time: string };
  setNewChapter: React.Dispatch<React.SetStateAction<{ title: string; start_time: string }>>;
  trimStatus: TrimStatus | null;
  onSyncMetadata: (id: string) => void;
  onGenerateSubtitles: () => void;
  onUploadSubtitle: (e: React.FormEvent<HTMLFormElement>) => void;
  onUploadThumbnail: (e: React.FormEvent<HTMLFormElement>) => void;
  onAddChapter: () => void;
  onDeleteChapter: (id: number) => void;
  onTrim: (e: React.FormEvent<HTMLFormElement>) => void;
  onRevertTrim: () => void;
}

function AssetSheetTabs({
  asset,
  activeTab,
  setActiveTab,
  isSyncing,
  isLoadingEnhancements,
  isActionPending,
  chapters,
  newChapter,
  setNewChapter,
  trimStatus,
  onSyncMetadata,
  onGenerateSubtitles,
  onUploadSubtitle,
  onUploadThumbnail,
  onAddChapter,
  onDeleteChapter,
  onTrim,
  onRevertTrim,
}: AssetSheetTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 bg-muted p-1 rounded-xl h-auto shrink-0">
        <TabsTrigger value="details" className="rounded-lg py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground transition-[background-color,color] px-1.5 sm:px-3">Details</TabsTrigger>
        <TabsTrigger value="subtitles" className="rounded-lg py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground transition-[background-color,color] px-1.5 sm:px-3">Subtitles</TabsTrigger>
        <TabsTrigger value="thumbnail" className="rounded-lg py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground transition-[background-color,color] px-1.5 sm:px-3">Thumbnail</TabsTrigger>
        <TabsTrigger value="chapters" className="rounded-lg py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground transition-[background-color,color] px-1.5 sm:px-3">Chapters</TabsTrigger>
        <TabsTrigger value="trim" className="rounded-lg py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground transition-[background-color,color] px-1.5 sm:px-3">Trim</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
        <div className="aspect-video relative rounded-2xl border border-border bg-muted overflow-hidden shadow-md group">
          {asset.thumbnail_url ? (
            <Image src={asset.thumbnail_url} alt={asset.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover opacity-90 transition-opacity group-hover:opacity-100" unoptimized />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="p-4 rounded-full bg-white/10 backdrop-blur-sm"><Play className="size-8 text-white/70 ml-1" /></div>
            </div>
          )}
          <div className="absolute top-4 right-4"><Badge className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border-none shadow-sm px-3 py-1 text-xs font-semibold">{formatDuration(asset.duration_seconds)}</Badge></div>
        </div>
        <div className="grid gap-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-2"><h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Asset Title</h4><p className="text-sm font-medium text-foreground leading-relaxed">{asset.title}</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-2 transition-colors"><h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">TP Asset ID</h4><p className="text-xs font-mono font-medium text-foreground">{asset.tp_asset_id}</p></div>
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-2 transition-colors"><h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</h4><div className="flex items-center gap-2"><Badge variant={asset.processing_status === 'completed' ? 'default' : 'secondary'} className="capitalize shadow-sm px-3 py-0.5 font-semibold">{asset.processing_status}</Badge></div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-2 transition-colors"><h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Duration</h4><p className="text-sm font-medium text-foreground">{formatDuration(asset.duration_seconds)}</p></div>
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-2 transition-colors"><h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Protection</h4><Badge variant="outline" className="capitalize font-semibold px-3 py-0.5 w-fit">{asset.content_protection_type || 'None'}</Badge></div>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Technical Metadata</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1"><span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Resolutions</span><p className="text-sm font-semibold text-slate-900">{asset.resolutions?.join(', ') || '-'}</p></div>
              <div className="space-y-1"><span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Video Codec</span><p className="text-sm font-semibold text-slate-900">{asset.video_codec || '-'}</p></div>
              <div className="space-y-1"><span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Audio Codec</span><p className="text-sm font-semibold text-slate-900">{asset.audio_codec || '-'}</p></div>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-2"><h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description</h4><p className="text-sm text-muted-foreground italic">{asset.description || 'No description provided.'}</p></div>
        </div>
        <div className="pt-4 flex flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={() => onSyncMetadata(asset.id)} disabled={isSyncing === asset.id}><RefreshCw className={`size-4 mr-2 ${isSyncing === asset.id ? 'animate-spin' : ''}`} />Sync Latest Metadata</Button>
          <Button variant="outline" className="w-full" asChild><a href={`https://app.tpstreams.com/assets/${asset.tp_asset_id}/`} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4 mr-2" />Open in TPStreams Panel</a></Button>
        </div>
      </TabsContent>

      <TabsContent value="subtitles" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
        <div className="p-8 rounded-2xl border border-border bg-card shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 p-8 opacity-10 transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105 [@media(hover:hover)_and_(pointer:fine)]:group-hover:rotate-6"><Subtitles className="size-24 text-amber-600" /></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-foreground"><AlertCircle className="size-6" /><h4 className="font-semibold text-base">Auto-subtitle Generation</h4></div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[90%]">Generating English subtitles automatically incurs a cost of approximately <span className="font-semibold">$0.071 per minute</span> on TPStreams.</p>
            <Button variant="outline" className="w-full mt-2 font-semibold rounded-xl h-12 transition-[background-color,transform] duration-160 active:scale-[0.98]" onClick={onGenerateSubtitles} disabled={isActionPending}>{isActionPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Subtitles className="size-4 mr-2" />}Generate English Subtitles</Button>
          </div>
        </div>
        <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-50 px-4 text-slate-400 font-semibold tracking-widest">OR MANUAL UPLOAD</span></div></div>
        <form onSubmit={onUploadSubtitle} className="space-y-6 p-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="space-y-2"><Label htmlFor="sub-file" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Subtitle File (.vtt)</Label><Input id="sub-file" name="file" type="file" accept=".vtt" required className="cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 h-12 pt-2.5 rounded-xl border-slate-200" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2"><Label htmlFor="sub-name" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Display Name</Label><Input id="sub-name" name="name" placeholder="e.g. English" className="rounded-xl h-12 border-slate-200 font-medium" /></div>
            <div className="space-y-2"><Label htmlFor="sub-lang" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Language Code</Label><Input id="sub-lang" name="language" placeholder="e.g. en" className="rounded-xl h-12 border-slate-200 font-medium font-mono" /></div>
          </div>
          <Button type="submit" className="w-full rounded-xl h-12 font-semibold uppercase tracking-widest shadow-md transition-[background-color,transform] duration-160 active:scale-[0.98]" disabled={isActionPending}>{isActionPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}Upload Subtitle Track</Button>
        </form>
      </TabsContent>

      <TabsContent value="thumbnail" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
        <div className="space-y-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-1">Current Thumbnail</h4>
          <div className="aspect-video relative rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm group">
            {asset.thumbnail_url ? (<Image src={asset.thumbnail_url} alt="Current thumbnail" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105" unoptimized />) : (<div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400"><ImageIcon className="size-10 opacity-50" /><span className="text-sm font-medium">No thumbnail set</span></div>)}
          </div>
        </div>
        <div className="space-y-4 pt-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-1">Upload New</h4>
          <form onSubmit={onUploadThumbnail} className="space-y-6 p-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="space-y-2"><Label htmlFor="thumb-file" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Image File (PNG/JPG, max 2MB)</Label><Input id="thumb-file" name="file" type="file" accept="image/png,image/jpeg,image/jpg" required className="cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 h-12 pt-2.5 rounded-xl border-slate-200" /></div>
            <Button type="submit" className="w-full rounded-xl h-12 font-semibold uppercase tracking-widest shadow-md transition-[background-color,transform] duration-160 active:scale-[0.98]" disabled={isActionPending}>{isActionPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <ImageIcon className="size-4 mr-2" />}Apply New Thumbnail</Button>
          </form>
        </div>
      </TabsContent>

      <TabsContent value="chapters" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
        <div className="p-8 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-6">
          <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2"><Plus className="size-5 text-blue-500" /> Add New Chapter</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            <div className="space-y-2"><Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Chapter Title</Label><Input placeholder="e.g. Introduction" value={newChapter.title} onChange={e => setNewChapter(prev => ({ ...prev, title: e.target.value }))} className="rounded-xl h-12 border-slate-200 font-medium" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Start Time (HH:MM:SS)</Label><div className="flex gap-2"><Input placeholder="00:00:00" value={newChapter.start_time} onChange={e => setNewChapter(prev => ({ ...prev, start_time: e.target.value }))} className="rounded-xl h-12 border-slate-200 font-mono font-medium" /><Button onClick={onAddChapter} size="icon" className="size-12 shrink-0 rounded-xl shadow-md transition-[background-color,transform] duration-160 active:scale-[0.98]" disabled={isActionPending}>{isActionPending ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}</Button></div></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1"><h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Timeline Chapters</h4><Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">{chapters.length} Total</Badge></div>
          {isLoadingEnhancements ? (<div className="flex flex-col items-center justify-center p-16 gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/50"><Loader2 className="size-8 animate-spin text-slate-400" /><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Loading chapters...</p></div>) : chapters.length === 0 ? (<div className="flex flex-col items-center justify-center p-16 gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/50"><ListOrdered className="size-10 text-slate-300" /><p className="text-sm font-medium text-slate-500 uppercase tracking-widest">No chapters added yet</p></div>) : (
            <div className="grid gap-3">
              {chapters.map((chapter, index) => (
                <div key={chapter.id || index} className="group flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-white hover:border-blue-100 hover:shadow-md transition-[border-color,box-shadow]">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">{index + 1}</div>
                    <div><p className="text-base font-semibold text-slate-900 leading-none">{chapter.title}</p><p className="text-xs font-mono font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">{chapter.start_time}</p></div>
                  </div>
                  <Button variant="ghost" size="icon" className="size-10 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-[opacity,background-color,color] duration-160" onClick={() => onDeleteChapter(chapter.id)} disabled={isActionPending}><Trash className="size-5" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="trim" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
        <div className="p-8 rounded-2xl border border-border bg-card text-foreground shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 p-8 opacity-10 transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105 [@media(hover:hover)_and_(pointer:fine)]:group-hover:rotate-6"><Scissors className="size-32" /></div>
          <div className="relative z-10 space-y-6">
            <div className="space-y-2"><div className="flex items-center gap-2"><div className="size-2 rounded-full bg-primary animate-pulse" /><h4 className="text-sm font-semibold text-foreground">Video Trimming</h4></div><p className="text-sm text-muted-foreground leading-relaxed max-w-[90%]">Define a segment to keep. The original video is preserved safely.</p></div>
            <form onSubmit={onTrim} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Start Offset (sec)</Label><Input name="start_time" type="number" min="0" step="1" placeholder="0" className="h-12 text-sm font-semibold font-mono rounded-xl" required /></div>
                <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">End Offset (sec)</Label><Input name="end_time" type="number" min="1" step="1" placeholder="120" className="h-12 text-sm font-semibold font-mono rounded-xl" required /></div>
              </div>
              <Button type="submit" className="w-full rounded-xl font-medium h-12 shadow-lg transition-[background-color,transform] duration-160 active:scale-[0.98]" disabled={isActionPending}>{isActionPending ? <Loader2 className="size-5 animate-spin mr-2" /> : <Scissors className="size-5 mr-2" />}Execute Trim Job</Button>
            </form>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-1">Pipeline Status</h4>
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm p-1">
            {isLoadingEnhancements ? (<div className="flex items-center justify-center p-12"><Loader2 className="size-8 animate-spin text-slate-400" /></div>) : trimStatus ? (() => {
              const status = trimStatus as TrimStatus;
              return (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Active Job</span><Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none shadow-none font-semibold px-3 py-1">{status.status_display || status.status}</Badge></div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between shadow-inner"><div className="flex items-center gap-4"><Scissors className="size-5 text-slate-400" /><span className="text-base font-mono font-semibold text-slate-700 tracking-tight">{status.start_time}s - {status.end_time}s</span></div><Button variant="ghost" size="sm" className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg h-9 px-4 transition-[background-color,color,transform] duration-160 active:scale-95" onClick={onRevertTrim} disabled={isActionPending}>Revert</Button></div>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono truncate px-1 uppercase tracking-widest">Task ID: {status.background_task_id}</p>
                </div>
              );
            })() : (<div className="flex flex-col items-center justify-center p-12 gap-3 text-center"><Clock className="size-10 text-slate-300" /><p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">No active trim configuration found</p></div>)}
          </div>
        </div>
        <div className="p-8 rounded-2xl border border-red-100 bg-red-50/30 space-y-4">
          <div className="flex items-center gap-2 text-red-600"><AlertCircle className="size-5" /><h4 className="font-semibold text-sm uppercase tracking-widest">Danger Zone</h4></div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">Reverting will restore the video to its original length. This starts a background processing job.</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function AssetManager({ assets, onRefresh }: AssetManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<VideoAssetsRow | null>(null);
  const [{
    syncingAssetId: isSyncing,
    deletingAssetId: isDeleting,
    loadingEnhancements: isLoadingEnhancements,
    actionPending: isActionPending,
  }, dispatch] = useReducer(assetActionReducer, {
    syncingAssetId: null,
    deletingAssetId: null,
    loadingEnhancements: false,
    actionPending: false,
  });
  
  // Tabs State
  const [activeTab, setActiveTab] = useState('details');

  // Chapters state
  const [chapters, setChapters] = useState<{ id: number; title: string; start_time: string }[]>([]);
  const [newChapter, setNewChapter] = useState(() => ({ title: '', start_time: '00:00:00' }));

  // Trim state
  const [trimStatus, setTrimStatus] = useState<TrimStatus | null>(null);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || asset.processing_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assets, searchQuery, statusFilter]);

  const loadChapters = async (assetId: string) => {
    try {
      dispatch({ type: 'LOAD_ENHANCEMENTS_START' });
      const res = await listChaptersAction(assetId);
      if (res.ok && res.data) {
        const data = res.data as { results: { id: number; title: string; start_time: string }[] };
        setChapters(data.results || []);
      } else {
        toast.error(res.error || 'Failed to load chapters');
      }
    } catch {
      toast.error('Failed to load chapters');
    } finally {
      dispatch({ type: 'LOAD_ENHANCEMENTS_END' });
    }
  };

  const loadTrimStatus = async (assetId: string) => {
    try {
      dispatch({ type: 'LOAD_ENHANCEMENTS_START' });
      const res = await getTrimStatusAction(assetId);
      if (res.ok && res.data) {
        setTrimStatus(res.data as TrimStatus);
      }
    } catch {
      // Often errors if no trim job exists, we can ignore
    } finally {
      dispatch({ type: 'LOAD_ENHANCEMENTS_END' });
    }
  };

  // Load chapters when tab changes to chapters
  useEffect(() => {
    if (selectedAsset && activeTab === 'chapters') {
      loadChapters(selectedAsset.id);
    }
    if (selectedAsset && activeTab === 'trim') {
      loadTrimStatus(selectedAsset.id);
    }
  }, [selectedAsset, activeTab]);

  const handleSyncMetadata = async (assetId: string) => {
    try {
      dispatch({ type: 'SYNC_START', assetId });
      const formData = new FormData();
      formData.set('asset_id', assetId);
      const result = await syncVideoAssetAction(formData);

      if (!result.ok) {
        toast.error(result.error || 'Failed to sync metadata');
        return;
      }

      toast.success('Metadata synced from TPStreams');
      onRefresh();
      
      // Update selected asset if currently open
      if (selectedAsset?.id === assetId) {
        const updated = assets.find(a => a.id === assetId);
        if (updated) setSelectedAsset(updated);
      }
    } catch {
      toast.error('An error occurred during sync');
    } finally {
      dispatch({ type: 'SYNC_END' });
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset? This action will also delete the video from TPStreams.')) {
      return;
    }

    try {
      dispatch({ type: 'DELETE_START', assetId });
      const formData = new FormData();
      formData.set('asset_id', assetId);
      const result = await deleteVideoAssetAction(formData);

      if (!result.ok) {
        toast.error(result.error || 'Failed to delete asset');
        return;
      }

      toast.success('Asset deleted successfully');
      setSelectedAsset(null);
      onRefresh();
    } catch {
      toast.error('An error occurred during deletion');
    } finally {
      dispatch({ type: 'DELETE_END' });
    }
  };

  // --- Subtitles --------------------------------------------------------------

  const handleGenerateSubtitles = async () => {
    if (!selectedAsset) return;
    if (!confirm('TPStreams may charge for auto-generated subtitles. Continue?')) return;

    try {
      dispatch({ type: 'ACTION_START' });
      const formData = new FormData();
      formData.set('asset_id', selectedAsset.id);
      const res = await generateSubtitleAction(formData);
      if (res.ok) {
        toast.success('Subtitle generation started');
        onRefresh();
      } else {
        toast.error(res.error || 'Failed to start subtitle generation');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  const handleUploadSubtitle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAsset) return;
    const formData = new FormData(e.currentTarget);
    formData.set('asset_id', selectedAsset.id);
    
    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      toast.error('Please select a .vtt file');
      return;
    }

    try {
      dispatch({ type: 'ACTION_START' });
      const res = await uploadSubtitleAction(formData);
      if (res.ok) {
        toast.success('Subtitle uploaded successfully');
        onRefresh();
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  // --- Thumbnail --------------------------------------------------------------

  const handleUploadThumbnail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAsset) return;
    const formData = new FormData(e.currentTarget);
    formData.set('asset_id', selectedAsset.id);

    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      toast.error('Please select an image file');
      return;
    }

    try {
      dispatch({ type: 'ACTION_START' });
      const tpFile = await prepareTpStreamsThumbnailFile(file);
      formData.set('file', tpFile);
      const res = await uploadThumbnailAction(formData);
      if (res.ok && res.data) {
        toast.success('Thumbnail updated');
        onRefresh();
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(res.error || 'Update failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  // --- Chapters ---------------------------------------------------------------

  const handleAddChapter = async () => {
    if (!selectedAsset) return;
    if (!newChapter.title.trim()) return toast.error('Chapter title required');

    try {
      dispatch({ type: 'ACTION_START' });
      const currentChapters = chapters.map(c => ({ title: c.title, start_time: c.start_time }));
      const updatedChapters = [...currentChapters, newChapter].sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      );

      const formData = new FormData();
      formData.set('asset_id', selectedAsset.id);
      formData.set('chapters', JSON.stringify(updatedChapters));

      const res = await addChaptersAction(formData);
      if (res.ok) {
        toast.success('Chapter added');
        loadChapters(selectedAsset.id);
        setNewChapter({ title: '', start_time: '00:00:00' });
      } else {
        toast.error(res.error || 'Failed to add chapter');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  const handleDeleteChapter = async (chapterId: number) => {
    if (!selectedAsset) return;
    if (!confirm('Delete this chapter?')) return;

    try {
      dispatch({ type: 'ACTION_START' });
      const formData = new FormData();
      formData.set('asset_id', selectedAsset.id);
      formData.set('chapter_id', chapterId.toString());

      const res = await deleteChapterAction(formData);
      if (res.ok) {
        toast.success('Chapter deleted');
        loadChapters(selectedAsset.id);
      } else {
        toast.error(res.error || 'Failed to delete chapter');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  // --- Trim -------------------------------------------------------------------

  const handleTrim = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAsset) return;
    const formData = new FormData(e.currentTarget);
    formData.set('asset_id', selectedAsset.id);

    try {
      dispatch({ type: 'ACTION_START' });
      const res = await trimVideoAction(formData);
      if (res.ok) {
        toast.success('Trim job started');
        loadTrimStatus(selectedAsset.id);
        onRefresh();
      } else {
        toast.error(res.error || 'Trim failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  const handleRevertTrim = async () => {
    if (!selectedAsset) return;
    if (!confirm('Revert video to original length? This will start a new job.')) return;

    try {
      dispatch({ type: 'ACTION_START' });
      const formData = new FormData();
      formData.set('asset_id', selectedAsset.id);
      const res = await revertTrimAction(formData);
      if (res.ok) {
        toast.success('Revert job started');
        loadTrimStatus(selectedAsset.id);
        onRefresh();
      } else {
        toast.error(res.error || 'Revert failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  const getStatusIcon = (status: VideoAssetProcessingStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="size-4 text-primary" />;
      case 'processing':
      case 'queued':
        return <Loader2 className="size-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="size-4 text-destructive" />;
      default:
        return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedAsset(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search assets by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors">
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">Thumbnail</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Title</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">Status</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">Duration</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[150px]">Created At</th>
                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">
                    No assets found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      {asset.thumbnail_url ? (
                        <div className="relative aspect-video w-20 rounded border overflow-hidden bg-muted">
                          <Image 
                            src={asset.thumbnail_url} 
                            alt={asset.title}
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="aspect-video w-20 rounded border bg-muted flex items-center justify-center">
                          <Play className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="font-medium max-w-[300px] truncate" title={asset.title}>
                        {asset.title}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                        {asset.tp_asset_id}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(asset.processing_status)}
                        <span className="capitalize text-xs">{asset.processing_status}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {formatDuration(asset.duration_seconds)}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground text-xs" suppressHydrationWarning>
                      {format(new Date(asset.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { setSelectedAsset(asset); setActiveTab('details'); }}>
                            <FileJson className="size-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleSyncMetadata(asset.id)}
                            disabled={isSyncing === asset.id}
                          >
                            <RefreshCw className={`size-4 mr-2 ${isSyncing === asset.id ? 'animate-spin' : ''}`} /> 
                            Sync Metadata
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a 
                              href={`https://app.tpstreams.com/assets/${asset.tp_asset_id}/`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="size-4 mr-2" /> TPStreams Panel
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleDeleteAsset(asset.id)}
                            disabled={isDeleting === asset.id}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete Safely
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selectedAsset} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[65vw] p-0 flex flex-col h-screen bg-background">
          <SheetHeader className="px-8 py-6 bg-background border-b shrink-0">
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-xl font-semibold tracking-tight text-foreground">Asset Manager</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Manage subtitles, thumbnails, chapters and trim for your video asset.
              </SheetDescription>
            </div>
          </SheetHeader>
          
          {selectedAsset && (
            <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
              <AssetSheetTabs
                asset={selectedAsset}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isSyncing={isSyncing}
                isLoadingEnhancements={isLoadingEnhancements}
                isActionPending={isActionPending}
                chapters={chapters}
                newChapter={newChapter}
                setNewChapter={setNewChapter}
                trimStatus={trimStatus}
                onSyncMetadata={handleSyncMetadata}
                onGenerateSubtitles={handleGenerateSubtitles}
                onUploadSubtitle={handleUploadSubtitle}
                onUploadThumbnail={handleUploadThumbnail}
                onAddChapter={handleAddChapter}
                onDeleteChapter={handleDeleteChapter}
                onTrim={handleTrim}
                onRevertTrim={handleRevertTrim}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
