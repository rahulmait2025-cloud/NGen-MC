'use client';

import * as React from 'react';

const LG_MIN = 1024;
const QUERY = `(min-width: ${LG_MIN}px)`;

/**
 * Hydration-safe: server and first paint assume `false` (below `lg`), then matchMedia on the client.
 */
export function useMinWidthLg() {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mq = window.matchMedia(QUERY);
    mq.addEventListener('change', onStoreChange);
    return () => mq.removeEventListener('change', onStoreChange);
  }, []);

  const getSnapshot = React.useCallback(() => window.matchMedia(QUERY).matches, []);

  const getServerSnapshot = React.useCallback(() => false, []);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
