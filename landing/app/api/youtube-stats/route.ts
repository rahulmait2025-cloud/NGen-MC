import { NextResponse } from "next/server";

const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
    subscribers: number | null;
    views: number | null;
    videos: number | null;
    updatedAt: string;
    error?: string;
}

let cache: CacheEntry | null = null;
let cacheTimestamp = 0;

export async function GET() {
    const now = Date.now();

    if (cache && now - cacheTimestamp < CACHE_TTL_MS) {
        return NextResponse.json(cache, {
            headers: {
                "Cache-Control": "s-maxage=600, stale-while-revalidate=600",
            },
        });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    if (!apiKey || !channelId) {
        const fallback: CacheEntry = {
            subscribers: 38500,
            views: 861400,
            videos: 744,
            updatedAt: new Date().toISOString(),
        };
        return NextResponse.json(fallback, { status: 200 });
    }

    try {
        const url = new URL("https://www.googleapis.com/youtube/v3/channels");
        url.searchParams.set("part", "statistics");
        url.searchParams.set("id", channelId);
        url.searchParams.set("key", apiKey);

        const res = await fetch(url.toString(), { cache: "no-store" });

        if (!res.ok) {
            throw new Error(`YouTube API responded with ${res.status}`);
        }

        const data = await res.json();
        const stats = data.items?.[0]?.statistics;

        if (!stats) {
            throw new Error("No statistics found for this channel");
        }

        const entry: CacheEntry = {
            subscribers: Number(stats.subscriberCount),
            views: Number(stats.viewCount),
            videos: Number(stats.videoCount),
            updatedAt: new Date().toISOString(),
        };

        cache = entry;
        cacheTimestamp = now;

        return NextResponse.json(entry, {
            headers: {
                "Cache-Control": "s-maxage=600, stale-while-revalidate=600",
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Stats unavailable";

        const fallback: CacheEntry = {
            subscribers: null,
            views: null,
            videos: null,
            updatedAt: new Date().toISOString(),
            error: message,
        };

        cache = fallback;
        cacheTimestamp = now - CACHE_TTL_MS + 2 * 60 * 1000;

        return NextResponse.json(fallback, { status: 200 });
    }
}
