'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  previewYouTubePlaylistAction,
  importYouTubeVideosAction,
} from '@/app/(app)/free-courses/actions';
import { YouTubeImportThumbnail } from '@/components/free-courses/youtube-import-thumbnail';
import type { PlaylistPreview } from '@/lib/free-courses/youtube-playlist-import';

interface SelectableVideo {
  youtubeVideoId: string;
  originalTitle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  defaultThumbnailUrl: string;
  position: number;
  durationSeconds: number | null;
  channelId: string | null;
  publishedAt: string | null;
  selected: boolean;
  isUnavailable: boolean;
  unavailableReason?: string;
}

interface YouTubeImportClientProps {
  courseId: string;
  courseTitle: string;
  defaultModuleId: string | null;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mapPreviewToVideos(preview: PlaylistPreview): SelectableVideo[] {
  return preview.videos.map((v) => ({
    youtubeVideoId: v.youtubeVideoId,
    originalTitle: v.originalTitle,
    title: v.defaultTitle,
    description: v.description,
    thumbnailUrl: v.thumbnailUrl,
    defaultThumbnailUrl: v.thumbnailUrl,
    position: v.position,
    durationSeconds: v.durationSeconds,
    channelId: v.channelId,
    publishedAt: v.publishedAt,
    selected: !v.isUnavailable,
    isUnavailable: v.isUnavailable,
    unavailableReason: v.unavailableReason,
  }));
}

interface ThumbnailDialogProps {
  thumbnailEditVideo: SelectableVideo | null;
  thumbnailDraft: string;
  pending: boolean;
  onThumbnailDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
}

function ThumbnailDialog({
  thumbnailEditVideo,
  thumbnailDraft,
  pending,
  onThumbnailDraftChange,
  onClose,
  onSave,
  onReset,
}: ThumbnailDialogProps) {
  return (
    <Dialog
      open={thumbnailEditVideo !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Custom thumbnail</DialogTitle>
          <DialogDescription>
            Override the thumbnail stored for this lesson. Leave blank to use YouTube defaults on import.
          </DialogDescription>
        </DialogHeader>
        {thumbnailEditVideo && (
          <div className="space-y-4">
            <div className="mx-auto h-[108px] w-[192px] overflow-hidden rounded-lg border">
              <YouTubeImportThumbnail
                videoId={thumbnailEditVideo.youtubeVideoId}
                thumbnailUrl={thumbnailDraft || thumbnailEditVideo.defaultThumbnailUrl}
                title={thumbnailEditVideo.originalTitle}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-thumbnail-url">Custom thumbnail URL</Label>
              <Input
                id="custom-thumbnail-url"
                value={thumbnailDraft}
                onChange={(e) => onThumbnailDraftChange(e.target.value)}
                placeholder="https://..."
                disabled={pending}
              />
            </div>
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!thumbnailEditVideo || pending}
            onClick={onReset}
          >
            Reset to YouTube thumbnail
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={pending}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function YouTubeImportClient({
  courseId,
  courseTitle,
  defaultModuleId,
}: YouTubeImportClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PlaylistPreview | null>(null);
  const [videos, setVideos] = useState<SelectableVideo[]>([]);
  const [thumbnailEditId, setThumbnailEditId] = useState<string | null>(null);
  const [thumbnailDraft, setThumbnailDraft] = useState('');
  const [publishOnImport, setPublishOnImport] = useState(true);

  const selectedCount = useMemo(
    () => videos.filter((v) => v.selected && !v.isUnavailable).length,
    [videos],
  );

  const availableVideos = useMemo(
    () => videos.filter((v) => !v.isUnavailable),
    [videos],
  );

  const thumbnailEditVideo = useMemo(
    () => videos.find((v) => v.youtubeVideoId === thumbnailEditId) ?? null,
    [videos, thumbnailEditId],
  );

  function handleFetch() {
    setError(null);
    startTransition(async () => {
      const result = await previewYouTubePlaylistAction(courseId, playlistUrl);
      if (!result.ok) {
        setError(result.error);
        setPreview(null);
        setVideos([]);
        return;
      }
      if (!result.data) {
        setError('Failed to fetch playlist');
        setPreview(null);
        setVideos([]);
        return;
      }
      setPreview(result.data);
      setVideos(mapPreviewToVideos(result.data));
    });
  }

  function updateVideo(
    youtubeVideoId: string,
    patch: Partial<Pick<SelectableVideo, 'title' | 'selected' | 'thumbnailUrl'>>,
  ) {
    setVideos((prev) =>
      prev.map((v) => (v.youtubeVideoId === youtubeVideoId ? { ...v, ...patch } : v)),
    );
  }

  function selectAllAvailable() {
    setVideos((prev) =>
      prev.map((v) => (v.isUnavailable ? v : { ...v, selected: true })),
    );
  }

  function deselectAll() {
    setVideos((prev) => prev.map((v) => ({ ...v, selected: false })));
  }

  function resetTitles() {
    setVideos((prev) =>
      prev.map((v) => ({
        ...v,
        title:
          preview?.videos.find((p) => p.youtubeVideoId === v.youtubeVideoId)?.defaultTitle ??
          v.title,
      })),
    );
  }

  function openThumbnailDialog(video: SelectableVideo) {
    setThumbnailEditId(video.youtubeVideoId);
    setThumbnailDraft(video.thumbnailUrl);
  }

  function closeThumbnailDialog() {
    setThumbnailEditId(null);
    setThumbnailDraft('');
  }

  function saveThumbnailDialog() {
    if (!thumbnailEditId) return;
    updateVideo(thumbnailEditId, { thumbnailUrl: thumbnailDraft.trim() });
    closeThumbnailDialog();
  }

  function resetThumbnailDialog() {
    if (!thumbnailEditVideo) return;
    setThumbnailDraft(thumbnailEditVideo.defaultThumbnailUrl);
    updateVideo(thumbnailEditVideo.youtubeVideoId, {
      thumbnailUrl: thumbnailEditVideo.defaultThumbnailUrl,
    });
  }

  function handleImport() {
    if (!preview) return;
    setError(null);

    startTransition(async () => {
      const result = await importYouTubeVideosAction({
        courseId,
        moduleId: defaultModuleId ?? undefined,
        playlistId: preview.playlistId,
        playlistTitle: preview.playlistTitle,
        channelTitle: preview.channelTitle,
        playlistThumbnailUrl: preview.thumbnailUrl,
        publishOnImport,
        videos: videos.map((v) => ({
          youtubeVideoId: v.youtubeVideoId,
          title: v.title,
          originalTitle: v.originalTitle,
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          position: v.position,
          durationSeconds: v.durationSeconds,
          channelId: v.channelId,
          publishedAt: v.publishedAt,
          selected: v.selected && !v.isUnavailable,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.data) {
        setError('Import failed');
        return;
      }

      const { imported, updated, totalSelected } = result.data;
      toast.success(
        publishOnImport
          ? `Imported and published ${imported} lecture(s), updated ${updated} of ${totalSelected} selected`
          : `Imported ${imported} lecture(s), updated ${updated} of ${totalSelected} selected (left as draft)`,
      );
      router.push(`/free-courses/${courseId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/free-courses/${courseId}`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Builder
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Youtube className="size-5 text-red-600" />
          <h2 className="text-xl font-semibold tracking-tight">Import YouTube Playlist</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Fetch a playlist, select lectures, customize titles, and add them to this free course.
        </p>
        <p className="text-xs text-muted-foreground font-mono">{courseTitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Playlist URL</CardTitle>
          <CardDescription>
            Paste a YouTube playlist link or playlist ID. Videos are referenced by ID only — nothing is downloaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="playlist-url">YouTube playlist URL</Label>
              <Input
                id="playlist-url"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..."
                disabled={pending}
              />
            </div>
            <Button onClick={handleFetch} disabled={pending || !playlistUrl.trim()}>
              {pending && !preview && <Loader2 className="mr-2 size-4 animate-spin" />}
              Fetch Playlist
            </Button>
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{preview.playlistTitle}</CardTitle>
              <CardDescription>
                {preview.channelTitle && <span>{preview.channelTitle} · </span>}
                {preview.videos.length} video(s) in playlist
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="h-[72px] w-32 shrink-0 overflow-hidden rounded-lg border">
                <YouTubeImportThumbnail
                  videoId=""
                  thumbnailUrl={preview.thumbnailUrl}
                  title={preview.playlistTitle}
                  className="min-h-full min-w-full"
                />
              </div>
              {preview.playlistDescription && (
                <p className="text-sm text-muted-foreground line-clamp-4 flex-1">
                  {preview.playlistDescription}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Select lectures</CardTitle>
                <CardDescription>
                  {selectedCount} of {availableVideos.length} available selected
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllAvailable}>
                  Select all available
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                  Deselect all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetTitles}>
                  Reset titles
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[50px] text-center">
                        {/* Empty/Checkbox column */}
                      </TableHead>
                      <TableHead className="w-[120px]">Thumb</TableHead>
                      <TableHead className="min-w-[200px]">YouTube title</TableHead>
                      <TableHead className="min-w-[240px]">Lesson title</TableHead>
                      <TableHead className="w-[60px] text-center">#</TableHead>
                      <TableHead className="w-[100px]">Duration</TableHead>
                      <TableHead className="w-[180px] text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.map((video) => (
                      <TableRow
                        key={video.youtubeVideoId || `pos-${video.position}`}
                        className={video.isUnavailable ? 'opacity-65 bg-muted/20' : undefined}
                      >
                        <TableCell className="text-center align-middle">
                          <Checkbox
                            checked={video.selected}
                            disabled={video.isUnavailable || pending}
                            onCheckedChange={(checked) =>
                              updateVideo(video.youtubeVideoId, { selected: checked === true })
                            }
                            aria-label={`Select ${video.originalTitle}`}
                          />
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="h-[54px] w-[96px] shrink-0 overflow-hidden rounded-md border bg-muted">
                            <YouTubeImportThumbnail
                              videoId={video.youtubeVideoId}
                              thumbnailUrl={video.thumbnailUrl}
                              title={video.originalTitle}
                              unavailable={video.isUnavailable}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="align-middle text-sm font-medium">
                          <span className="line-clamp-2 block max-w-[280px]" title={video.originalTitle}>
                            {video.originalTitle}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <Input
                            value={video.title}
                            disabled={video.isUnavailable || pending}
                            onChange={(e) =>
                              updateVideo(video.youtubeVideoId, { title: e.target.value })
                            }
                            className="h-9 w-full bg-background"
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle text-sm tabular-nums text-muted-foreground">
                          {video.position + 1}
                        </TableCell>
                        <TableCell className="align-middle text-sm tabular-nums text-muted-foreground">
                          {formatDuration(video.durationSeconds)}
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex items-center justify-end gap-2">
                            {video.isUnavailable ? (
                              <Badge variant="destructive" className="text-[10px]">
                                {video.unavailableReason ?? 'Unavailable'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                OK
                              </Badge>
                            )}
                            {!video.isUnavailable && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2"
                                disabled={pending}
                                onClick={() => openThumbnailDialog(video)}
                              >
                                Thumbnail
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <ThumbnailDialog
            thumbnailEditVideo={thumbnailEditVideo}
            thumbnailDraft={thumbnailDraft}
            pending={pending}
            onThumbnailDraftChange={setThumbnailDraft}
            onClose={closeThumbnailDialog}
            onSave={saveThumbnailDialog}
            onReset={resetThumbnailDialog}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-start gap-2 text-sm cursor-pointer max-w-xl">
              <Checkbox
                checked={publishOnImport}
                onCheckedChange={(checked) => setPublishOnImport(checked === true)}
                disabled={pending}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Publish imported lectures immediately</span>
                <span className="block text-muted-foreground text-xs mt-0.5">
                  Students can see them as soon as the course itself is published. Turn off to keep
                  new lessons as draft.
                </span>
              </span>
            </label>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button asChild variant="outline">
                <Link href={`/free-courses/${courseId}`}>Cancel</Link>
              </Button>
              <Button onClick={handleImport} disabled={pending || selectedCount === 0}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {publishOnImport
                  ? `Import & publish (${selectedCount})`
                  : `Import as draft (${selectedCount})`}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
