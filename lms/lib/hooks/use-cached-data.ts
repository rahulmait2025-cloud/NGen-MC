'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_PREFIX = 'lms_cache_v1_';
const DEFAULT_TTL = 30000;

function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

function getCachedData<T>(key: string, ttl = DEFAULT_TTL): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(getCacheKey(key));
    if (!stored) return null;
    
    const cached: CachedData<T> = JSON.parse(stored);
    const isExpired = Date.now() - cached.timestamp > ttl;
    
    if (isExpired) {
      localStorage.removeItem(getCacheKey(key));
      return null;
    }
    
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cached: CachedData<T> = { data, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(key), JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

function _clearCachedData(key?: string): void {
  if (typeof window === 'undefined') return;
  
  if (key) {
    localStorage.removeItem(getCacheKey(key));
  } else {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
}

interface UseCachedDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  initialData?: T;
}

export function useCachedData<T>({
  key,
  fetcher,
  ttl = DEFAULT_TTL,
  initialData,
}: UseCachedDataOptions<T>) {
  const [data, setData] = useState<T | undefined>(() => {
    if (typeof window === 'undefined') return initialData;
    const cached = getCachedData<T>(key, ttl);
    return cached ?? initialData;
  });
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchingCountRef = useRef(0);
  const mountedRef = useRef(true);
  // In-flight deduplication: track active fetcher promises by key
  const inFlightRef = useRef<Map<string, Promise<T>>>(new Map());

  const refetch = useCallback(async () => {
    // Deduplicate: if a fetch for this key is already in-flight, return it
    const existing = inFlightRef.current.get(key);
    if (existing) {
      try {
        const result = await existing;
        if (mountedRef.current) {
          setData(result);
          setError(null);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
        return undefined;
      }
    }

    fetchingCountRef.current++;
    if (mountedRef.current) setIsLoading(true);

    const promise = fetcher()
      .then((result) => {
        if (mountedRef.current) {
          setCachedData(key, result);
          setData(result);
          setError(null);
        }
        return result;
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          const cached = getCachedData<T>(key, ttl);
          if (cached) setData(cached);
        }
        throw err;
      })
      .finally(() => {
        inFlightRef.current.delete(key);
        fetchingCountRef.current = Math.max(0, fetchingCountRef.current - 1);
        if (mountedRef.current) {
          setIsLoading(fetchingCountRef.current > 0);
        }
      });

    inFlightRef.current.set(key, promise);
    return promise;
  }, [key, fetcher, ttl]);

  useEffect(() => {
    mountedRef.current = true;
    void Promise.resolve().then(() => {
      if (mountedRef.current) void refetch();
    });
    return () => {
      mountedRef.current = false;
    };
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
