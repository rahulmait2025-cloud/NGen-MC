'use client';

import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const inMemoryCache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_STALE_TIME = 30 * 1000; // 30 seconds
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

interface UseSWROptions<T> {
  fallbackData?: T;
  revalidateOnFocus?: boolean;
  revalidateOnMount?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface UseSWRReturn<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  mutate: () => void;
}

export function useSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseSWROptions<T> = {}
): UseSWRReturn<T> {
  const {
    fallbackData,
    staleTime = DEFAULT_STALE_TIME,
    cacheTime = DEFAULT_CACHE_TIME,
  } = options;

  const [data, setData] = useState<T | undefined>(fallbackData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!fallbackData);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    const cached = inMemoryCache.get(key) as CacheEntry<T> | undefined;

    if (cached && now - cached.timestamp < staleTime) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetcher();
      inMemoryCache.set(key, { data: result, timestamp: now });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      const currentCached = inMemoryCache.get(key) as CacheEntry<T> | undefined;
      if (!currentCached && fallbackData) {
        setData(fallbackData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, staleTime, fallbackData]);

  const mutate = useCallback(() => {
    inMemoryCache.delete(key);
    fetchData();
  }, [key, fetchData]);

  useEffect(() => {
    fetchData();

    // Cleanup old cache entries periodically
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of inMemoryCache.entries()) {
        if (now - v.timestamp > cacheTime) {
          inMemoryCache.delete(k);
        }
      }
    }, cacheTime);

    return () => clearInterval(cleanup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, error, isLoading, mutate };
}

function _clearCache(key?: string) {
  if (key) {
    inMemoryCache.delete(key);
  } else {
    inMemoryCache.clear();
  }
}

function _prefetchData<T>(key: string, fetcher: () => Promise<T>, staleTime = DEFAULT_STALE_TIME) {
  const now = Date.now();
  const cached = inMemoryCache.get(key) as CacheEntry<T> | undefined;

  if (!cached || now - cached.timestamp > staleTime) {
    fetcher().then((result) => {
      inMemoryCache.set(key, { data: result, timestamp: Date.now() });
    }).catch(() => {
      // Silent fail for prefetch
    });
  }
}