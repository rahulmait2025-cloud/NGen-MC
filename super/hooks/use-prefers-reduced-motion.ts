import * as React from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let cachedMatches: boolean | null = null;
let listeners: Array<(matches: boolean) => void> = [];

function getMatches(): boolean {
  if (typeof window === 'undefined') return false;
  if (cachedMatches !== null) return cachedMatches;
  cachedMatches = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  return cachedMatches;
}

function subscribe(callback: (matches: boolean) => void): () => void {
  listeners.push(callback);

  if (listeners.length === 1 && typeof window !== 'undefined') {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const handler = (e: MediaQueryListEvent) => {
      cachedMatches = e.matches;
      listeners.forEach((cb) => cb(e.matches));
    };
    mql.addEventListener('change', handler);
    return () => {
      mql.removeEventListener('change', handler);
      listeners = [];
      cachedMatches = null;
    };
  }

  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(getMatches);

  React.useEffect(() => {
    return subscribe((matches) => {
      setPrefersReducedMotion(matches);
    });
  }, []);

  return prefersReducedMotion;
}
