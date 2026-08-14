import 'server-only';

import { formatYoutubeLessonTitle } from '@/lib/utils/format-youtube-lesson-title';

const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;
const PLAYLIST_API_CHUNK = 50;
const UNAVAILABLE_TITLES = new Set(['private video', 'deleted video']);

export interface PlaylistPreviewVideo {
  youtubeVideoId: string;
  originalTitle: string;
  defaultTitle: string;
  description: string;
  thumbnailUrl: string;
  channelId: string | null;
  channelTitle: string | null;
  publishedAt: string | null;
  position: number;
  durationSeconds: number | null;
  isUnavailable: boolean;
  unavailableReason?: string;
}

export interface PlaylistPreview {
  playlistId: string;
  playlistTitle: string;
  playlistDescription: string;
  channelId: string | null;
  channelTitle: string | null;
  thumbnailUrl: string;
  videos: PlaylistPreviewVideo[];
}

function getYouTubeApiKey(): string {
  const key =
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.GOOGLE_YOUTUBE_API_KEY?.trim() ||
    '';
  if (!key) {
    throw new Error('YouTube API key is not configured.');
  }
  return key;
}

function pickThumbnail(snippet: {
  thumbnails?: Record<string, { url?: string } | undefined>;
}): string {
  const t = snippet.thumbnails;
  if (!t) return '';
  return (
    t.maxres?.url ||
    t.standard?.url ||
    t.high?.url ||
    t.medium?.url ||
    t.default?.url ||
    ''
  );
}

function parseIso8601DurationToSeconds(duration: string): number | null {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

function mapYouTubeApiError(status: number, body: unknown): string {
  const err = body as { error?: { message?: string; errors?: { reason?: string }[] } };
  const message = err.error?.message?.trim();
  const reason = err.error?.errors?.[0]?.reason;

  if (status === 403) {
    if (reason === 'quotaExceeded') {
      return 'YouTube API quota exceeded. Try again later.';
    }
    return 'YouTube API access denied. Check API key permissions.';
  }
  if (status === 404) {
    return 'YouTube playlist not found.';
  }
  if (message) {
    return message;
  }
  return 'Failed to fetch playlist from YouTube.';
}

async function youtubeFetch<T>(url: URL): Promise<T> {
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(mapYouTubeApiError(res.status, data));
  }
  return data;
}

/** Parse playlist ID from URL or raw ID string. */
function extractYouTubePlaylistId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Invalid YouTube playlist URL or playlist ID.');
  }

  if (PLAYLIST_ID_PATTERN.test(trimmed) && !trimmed.includes('http')) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error('Invalid YouTube playlist URL or playlist ID.');
  }

  const host = url.hostname.replace(/^www\./, '');
  if (!['youtube.com', 'youtu.be', 'm.youtube.com'].includes(host)) {
    throw new Error('Invalid YouTube playlist URL or playlist ID.');
  }

  const listParam = url.searchParams.get('list');
  if (listParam && PLAYLIST_ID_PATTERN.test(listParam)) {
    return listParam;
  }

  throw new Error('Invalid YouTube playlist URL or playlist ID.');
}

type PlaylistItemApi = {
  snippet: {
    title: string;
    description: string;
    position: number;
    publishedAt?: string;
    channelId?: string;
    channelTitle?: string;
    videoOwnerChannelId?: string;
    videoOwnerChannelTitle?: string;
    thumbnails?: Record<string, { url?: string }>;
    resourceId?: { videoId?: string };
  };
  contentDetails: { videoId: string };
};

type PlaylistItemsApiResponse = {
  items?: PlaylistItemApi[];
  nextPageToken?: string;
};

type PlaylistApiResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      channelId?: string;
      channelTitle?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
};

type VideosApiResponse = {
  items?: Array<{
    id: string;
    contentDetails?: { duration?: string };
    snippet?: { title?: string };
  }>;
};

async function fetchAllPlaylistItems(
  playlistId: string,
  apiKey: string,
): Promise<PlaylistItemApi[]> {
  const allItems: PlaylistItemApi[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('maxResults', String(PLAYLIST_API_CHUNK));
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('key', apiKey);
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const data = await youtubeFetch<PlaylistItemsApiResponse>(url);
    allItems.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allItems;
}

async function fetchPlaylistMetadata(
  playlistId: string,
  apiKey: string,
): Promise<{
  title: string;
  description: string;
  channelId: string | null;
  channelTitle: string | null;
  thumbnailUrl: string;
}> {
  const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('id', playlistId);
  url.searchParams.set('key', apiKey);

  const data = await youtubeFetch<PlaylistApiResponse>(url);
  const item = data.items?.[0];
  if (!item?.snippet) {
    throw new Error('YouTube playlist not found.');
  }

  return {
    title: item.snippet.title?.trim() || 'Untitled playlist',
    description: item.snippet.description?.trim() || '',
    channelId: item.snippet.channelId ?? null,
    channelTitle: item.snippet.channelTitle ?? null,
    thumbnailUrl: pickThumbnail(item.snippet),
  };
}

async function fetchVideoDetailsMap(
  videoIds: string[],
  apiKey: string,
): Promise<Map<string, { durationSeconds: number | null; title?: string }>> {
  const map = new Map<string, { durationSeconds: number | null; title?: string }>();
  if (videoIds.length === 0) return map;

  const chunkData = await Promise.all(
    chunkIds(videoIds, PLAYLIST_API_CHUNK).map(async (chunk) => {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'contentDetails,snippet');
      url.searchParams.set('id', chunk.join(','));
      url.searchParams.set('key', apiKey);
      return youtubeFetch<VideosApiResponse>(url);
    }),
  );

  for (const data of chunkData) {
    for (const item of data.items ?? []) {
      const duration = item.contentDetails?.duration;
      map.set(item.id, {
        durationSeconds: duration ? parseIso8601DurationToSeconds(duration) : null,
        title: item.snippet?.title,
      });
    }
  }

  return map;
}

function detectUnavailable(
  videoId: string,
  title: string,
  detailsFound: boolean,
): { isUnavailable: boolean; unavailableReason?: string } {
  if (!videoId) {
    return { isUnavailable: true, unavailableReason: 'Missing video ID' };
  }

  const normalizedTitle = title.trim().toLowerCase();
  if (UNAVAILABLE_TITLES.has(normalizedTitle)) {
    return {
      isUnavailable: true,
      unavailableReason: normalizedTitle === 'private video' ? 'Private' : 'Deleted',
    };
  }

  if (!detailsFound && videoId) {
    return { isUnavailable: true, unavailableReason: 'Unavailable' };
  }

  return { isUnavailable: false };
}

/** Fetch full playlist preview for SuperAdmin import UI. */
export async function fetchYouTubePlaylistPreview(input: string): Promise<PlaylistPreview> {
  const apiKey = getYouTubeApiKey();
  const playlistId = extractYouTubePlaylistId(input);

  const [playlistMeta, playlistItems] = await Promise.all([
    fetchPlaylistMetadata(playlistId, apiKey),
    fetchAllPlaylistItems(playlistId, apiKey),
  ]);

  if (playlistItems.length === 0) {
    throw new Error('No videos found in this playlist.');
  }

  const videoIds = playlistItems.reduce<string[]>((acc, item) => {
    const id = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
    if (id) acc.push(id);
    return acc;
  }, []);

  const videoDetails = await fetchVideoDetailsMap(videoIds, apiKey);

  const videos: PlaylistPreviewVideo[] = playlistItems.map((item) => {
    const videoId =
      item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
    const originalTitle = item.snippet?.title?.trim() || 'Untitled';
    const details = videoDetails.get(videoId);
    const { isUnavailable, unavailableReason } = detectUnavailable(
      videoId,
      originalTitle,
      Boolean(details),
    );

    const thumbnailUrl =
      pickThumbnail(item.snippet) ||
      (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : '');

    return {
      youtubeVideoId: videoId,
      originalTitle,
      defaultTitle: formatYoutubeLessonTitle(originalTitle),
      description: item.snippet?.description?.trim() || '',
      thumbnailUrl,
      channelId:
        item.snippet?.videoOwnerChannelId || item.snippet?.channelId || null,
      channelTitle:
        item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || null,
      publishedAt: item.snippet?.publishedAt ?? null,
      position: item.snippet?.position ?? 0,
      durationSeconds: details?.durationSeconds ?? null,
      isUnavailable,
      unavailableReason,
    };
  });

  return {
    playlistId,
    playlistTitle: playlistMeta.title,
    playlistDescription: playlistMeta.description,
    channelId: playlistMeta.channelId,
    channelTitle: playlistMeta.channelTitle,
    thumbnailUrl: playlistMeta.thumbnailUrl,
    videos,
  };
}
