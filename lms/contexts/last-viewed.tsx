'use client';

import React, { createContext, useCallback, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'lms_last_viewed:v1';
const LEGACY_STORAGE_KEY = 'lms_last_viewed';

export interface LastViewedState {
  pillarId: string;
  pillarName?: string;
  videoId?: string;
  videoTitle?: string;
  lastViewedAt: string;
}

interface LastViewedContextValue {
  lastViewed: LastViewedState | null;
  setLastViewed: (pillarId: string, videoId?: string, videoTitle?: string, pillarName?: string) => void;
  clearLastViewed: () => void;
}

const LastViewedContext = createContext<LastViewedContextValue | null>(null);

function parseStored(raw: string): LastViewedState | null {
  const parsed = JSON.parse(raw) as LastViewedState;
  if (parsed && typeof parsed.pillarId === 'string' && typeof parsed.lastViewedAt === 'string') {
    return parsed;
  }
  return null;
}

function readFromStorage(): LastViewedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseStored(raw);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const state = parseStored(legacy);
      if (state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return state;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function writeToStorage(state: LastViewedState | null) {
  if (typeof window === 'undefined') return;
  try {
    if (state === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore
  }
}

let cachedStorageValue: LastViewedState | null = null;
let storageListeners: Set<() => void> | null = null;

function subscribeToStorage(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  
  if (!storageListeners) {
    storageListeners = new Set();
  }
  storageListeners.add(onStoreChange);
  
  const handleStorageChange = () => {
    cachedStorageValue = readFromStorage();
    storageListeners?.forEach(listener => listener());
  };
  
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('lms-last-viewed-update', handleStorageChange);
  
  return () => {
    storageListeners?.delete(onStoreChange);
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('lms-last-viewed-update', handleStorageChange);
  };
}

function getStorageSnapshot(): LastViewedState | null {
  if (typeof window === 'undefined') return null;
  if (!cachedStorageValue) {
    cachedStorageValue = readFromStorage();
  }
  return cachedStorageValue;
}

function getServerSnapshot(): LastViewedState | null {
  return null;
}

export function LastViewedProvider({ children }: { children: React.ReactNode }) {
  const lastViewed = useSyncExternalStore(
    subscribeToStorage,
    getStorageSnapshot,
    getServerSnapshot
  );

  const setLastViewed = useCallback(
    (pillarId: string, videoId?: string, videoTitle?: string, pillarName?: string) => {
      const next: LastViewedState = {
        pillarId,
        pillarName,
        videoId,
        videoTitle,
        lastViewedAt: new Date().toISOString(),
      };
      cachedStorageValue = next;
      writeToStorage(next);
      window.dispatchEvent(new Event('lms-last-viewed-update'));
    },
    []
  );

  const clearLastViewed = useCallback(() => {
    cachedStorageValue = null;
    writeToStorage(null);
    window.dispatchEvent(new Event('lms-last-viewed-update'));
  }, []);

  const value: LastViewedContextValue = useMemo(() => ({
    lastViewed,
    setLastViewed,
    clearLastViewed,
  }), [lastViewed, setLastViewed, clearLastViewed]);

  return (
    <LastViewedContext.Provider value={value}>
      {children}
    </LastViewedContext.Provider>
  );
}


