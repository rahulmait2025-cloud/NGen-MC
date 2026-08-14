'use server';

import { getVerifiedIdentity } from '@/lib/student-runtime/identity';

export interface YouTubeCourse {
  id: string;
  playlistId: string;
  title: string;
  description: string;
  thumbnail?: string;
  videoCount?: number;
}

export interface YouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  position: number;
  duration?: string;
  views?: string;
}

function parseISO8601Duration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const parts = [
    match[1], // hours
    match[2] || '0', // minutes
    match[3] || '0', // seconds
  ];

  const formattedParts = parts.flatMap((p, i) => {
    if (i === 0 && !p) return [];
    return [p.padStart(2, '0')];
  });

  if (formattedParts.length === 1) {
    return `00:${formattedParts[0]}`;
  }

  if (formattedParts.length === 2 && formattedParts[0]!.startsWith('0')) {
    formattedParts[0] = formattedParts[0]!.substring(1);
  }

  return formattedParts.join(':');
}

function formatViews(views: string): string {
  const num = parseInt(views, 10);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return views;
}

type PlaylistItemApi = {
  id: string;
  contentDetails: { videoId: string };
  snippet: {
    title: string;
    description: string;
    position: number;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
};

type PlaylistItemsApiResponse = {
  items?: PlaylistItemApi[];
  nextPageToken?: string;
};

type VideoItemApi = {
  id: string;
  contentDetails: { duration: string };
  statistics: { viewCount: string };
  status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string };
};

type VideosApiResponse = {
  items?: VideoItemApi[];
};

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

async function fetchAllPlaylistItems(
  playlistId: string,
  apiKey: string,
): Promise<PlaylistItemApi[]> {
  const allItems: PlaylistItemApi[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('key', apiKey);
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const playlistResponse = await fetch(url.toString());
    if (!playlistResponse.ok) {
      const errorData = await playlistResponse.json();
      console.error('YouTube Playlist API Error:', errorData);
      break;
    }

    const playlistData = (await playlistResponse.json()) as PlaylistItemsApiResponse;
    allItems.push(...(playlistData.items ?? []));
    pageToken = playlistData.nextPageToken;
  } while (pageToken);

  return allItems;
}

export async function getPlaylistVideos(playlistId: string): Promise<YouTubeVideo[]> {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return [];
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY is missing from environment variables.');
    return [];
  }

  try {
    const playlistItems = await fetchAllPlaylistItems(playlistId, apiKey);
    if (playlistItems.length === 0) {
      return [];
    }

    const videoIds = playlistItems.flatMap((item) => {
      const id = item.contentDetails.videoId;
      return id ? [id] : [];
    });

    const videoDetailsMap: Record<string, { duration: string; views: string; playable: boolean }> = {};

    const CONCURRENCY = 3;
    const chunks = chunkIds(videoIds, 50);
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const batch = chunks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (idChunk) => {
          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,status&id=${idChunk.join(',')}&key=${apiKey}`,
          );

          if (!videoResponse.ok) return null;
          return (await videoResponse.json()) as VideosApiResponse;
        }),
      );

      for (const videoData of batchResults) {
        if (!videoData) continue;
        for (const item of videoData.items ?? []) {
          const status = item.status;
          videoDetailsMap[item.id] = {
            duration: parseISO8601Duration(item.contentDetails.duration),
            views: formatViews(item.statistics.viewCount),
            playable:
              status?.embeddable !== false &&
              status?.privacyStatus !== 'private' &&
              status?.uploadStatus !== 'deleted' &&
              status?.uploadStatus !== 'rejected',
          };
        }
      }
    }

    return playlistItems.flatMap((item) => {
      const vId = item.contentDetails.videoId;
      const details = videoDetailsMap[vId];
      if (!vId || !details?.playable) return [];

      return {
        id: item.id,
        videoId: vId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url ||
          (vId ? `https://img.youtube.com/vi/${vId}/mqdefault.jpg` : ''),
        position: item.snippet.position,
        duration: details.duration || '0:00',
        views: details.views || '0',
      };
    });
  } catch (error) {
    console.error('Error fetching YouTube playlist:', error);
    return [];
  }
}
