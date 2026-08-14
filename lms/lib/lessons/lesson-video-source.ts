import { parseYouTubeVideoId, youTubeEmbedUrl } from '@/lib/youtube/parse-video-url';

export type LessonVideoSource =
  | { kind: 'tpstreams'; videoAssetId: string }
  | { kind: 'youtube'; videoId: string; embedUrl: string }
  | { kind: 'none' };

export type LessonItemForVideoSource = {
  video_asset_id?: string | null;
  video_source?: string | null;
  youtube_video_id?: string | null;
  metadata?: Record<string, unknown> | null;
  external_metadata?: Record<string, unknown> | null;
};

function readStringField(
  source: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = source?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveYouTubeIdFromItem(item: LessonItemForVideoSource): string | null {
  const direct = item.youtube_video_id?.trim();
  if (direct) {
    return parseYouTubeVideoId(direct) ?? (/^[a-zA-Z0-9_-]{11}$/.test(direct) ? direct : null);
  }

  const metaId = readStringField(item.metadata ?? undefined, 'youtube_video_id');
  if (metaId) {
    const parsed = parseYouTubeVideoId(metaId);
    if (parsed) return parsed;
  }

  const urlCandidates = [
    readStringField(item.metadata ?? undefined, 'youtube_url'),
    readStringField(item.metadata ?? undefined, 'video_url'),
    readStringField(item.external_metadata ?? undefined, 'youtube_url'),
  ];

  for (const url of urlCandidates) {
    const parsed = parseYouTubeVideoId(url);
    if (parsed) return parsed;
  }

  return null;
}

/** Resolve playable source: TPStreams asset takes priority over YouTube. */
export function resolveLessonVideoSource(item: LessonItemForVideoSource): LessonVideoSource {
  const assetId = item.video_asset_id?.trim();
  if (assetId) {
    return { kind: 'tpstreams', videoAssetId: assetId };
  }

  const youtubeId = resolveYouTubeIdFromItem(item);
  if (youtubeId) {
    return {
      kind: 'youtube',
      videoId: youtubeId,
      embedUrl: youTubeEmbedUrl(youtubeId, false),
    };
  }

  if (item.video_source === 'youtube') {
    return { kind: 'none' };
  }

  return { kind: 'none' };
}

export function isYouTubeBackedLesson(item: LessonItemForVideoSource): boolean {
  return resolveLessonVideoSource(item).kind === 'youtube';
}
