'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function usePageTransition() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return { mounted };
}
