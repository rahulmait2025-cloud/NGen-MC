'use client';

/**
 * Request deduplication utility to prevent duplicate concurrent fetch requests.
 * Based on SWR's deduplication strategy.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const inFlightRequests = new Map<string, Promise<unknown>>();
const dataCache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL = 30000;

function isExpired(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp > ttl;
}

function getCacheKey(url: string, options?: RequestInit): string {
  return `${url}:${JSON.stringify(options ?? {})}`;
}

export async function fetchWithDeduplication<T>(
  url: string,
  options?: RequestInit & { ttl?: number }
): Promise<T> {
  const cacheKey = getCacheKey(url, options);
  const ttl = options?.ttl ?? DEFAULT_TTL;

  const cached = dataCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (cached && !isExpired(cached.timestamp, ttl)) {
    return cached.data;
  }

  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const request = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json() as T;
      dataCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, request);
  return request as Promise<T>;
}

export function invalidateCache(url?: string, options?: RequestInit): void {
  if (url) {
    const cacheKey = getCacheKey(url, options);
    dataCache.delete(cacheKey);
  } else {
    dataCache.clear();
  }
}

export function clearAllCaches(): void {
  inFlightRequests.clear();
  dataCache.clear();
}

interface UseFetchDeduplicationOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
}

export function useFetchDeduplication<T>({
  key,
  fetcher,
  ttl = DEFAULT_TTL,
}: UseFetchDeduplicationOptions<T>): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<T>;
} {
  const [data, setData] = useState<T | undefined>(() => {
    const cached = dataCache.get(key) as CacheEntry<T> | undefined;
    if (cached && !isExpired(cached.timestamp, ttl)) {
      return cached.data;
    }
    return undefined;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef<Promise<T> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refetch = useCallback(async (): Promise<T> => {
    // Check in-memory cache first
    const cached = dataCache.get(key) as CacheEntry<T> | undefined;
    if (cached && !isExpired(cached.timestamp, ttl)) {
      if (mountedRef.current) {
        setData(cached.data);
        setError(null);
      }
      return cached.data;
    }

    // Deduplicate in-flight requests
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    if (mountedRef.current) setIsLoading(true);

    const promise = fetcher()
      .then((result) => {
        dataCache.set(key, { data: result, timestamp: Date.now() });
        if (mountedRef.current) {
          setData(result);
          setError(null);
        }
        return result;
      })
      .catch((err) => {
        const error = err instanceof Error ? err : new Error('Unknown error');
        if (mountedRef.current) setError(error);
        throw error;
      })
      .finally(() => {
        inFlightRef.current = null;
        if (mountedRef.current) setIsLoading(false);
      });

    inFlightRef.current = promise;
    return promise;
  }, [key, fetcher, ttl]);

  // Initial fetch on mount (deferred to avoid sync setState-in-effect)
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void refetch();
    });
    return () => {
      cancelled = true;
    };
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
