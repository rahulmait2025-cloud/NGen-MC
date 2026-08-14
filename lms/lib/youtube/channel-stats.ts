import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';

import {
  formatSubscriberCountCompact,
  SUBSCRIBER_FALLBACK_DISPLAY,
} from '@/lib/youtube/format-subscriber-count';

export type YouTubeChannelStats = {
  subscriberCount: number | null;
  subscriberDisplay: string;
};

function fallbackStats(): YouTubeChannelStats {
  return {
    subscriberCount: null,
    subscriberDisplay: SUBSCRIBER_FALLBACK_DISPLAY,
  };
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/**
 * Fetches raw YouTube channel subscriber count.
 */
async function fetchYouTubeChannelStatsRaw(): Promise<YouTubeChannelStats> {
  const apiKey = readEnv('YOUTUBE_API_KEY');
  const channelId =
    readEnv('YOUTUBE_CHANNEL_ID') ?? readEnv('NEXT_PUBLIC_YOUTUBE_CHANNEL_ID');

  if (!apiKey || !channelId) {
    return fallbackStats();
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.set('part', 'statistics');
  url.searchParams.set('id', channelId);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), {
    next: { revalidate: 604800 }, // 1 week revalidate for the fetch cache
  });

  if (!res.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[youtube] channel stats fetch failed:', res.status);
    }
    return fallbackStats();
  }

  const data = (await res.json()) as {
    items?: Array<{ statistics?: { subscriberCount?: string } }>;
  };

  const raw = data.items?.[0]?.statistics?.subscriberCount;
  const count = raw !== undefined ? parseInt(raw, 10) : NaN;

  if (!Number.isFinite(count) || count < 0) {
    return fallbackStats();
  }

  return {
    subscriberCount: count,
    subscriberDisplay: formatSubscriberCountCompact(count),
  };
}

/**
 * Fetches real YouTube channel subscriber count (server-only, cached for 1 week).
 */
export async function getYouTubeChannelStats(): Promise<YouTubeChannelStats> {
  'use cache';
  cacheLife('hours');
  cacheTag('youtube-channel-stats');
  try {
    return await fetchYouTubeChannelStatsRaw();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[youtube] channel stats error:', error);
    }
    return fallbackStats();
  }
}

