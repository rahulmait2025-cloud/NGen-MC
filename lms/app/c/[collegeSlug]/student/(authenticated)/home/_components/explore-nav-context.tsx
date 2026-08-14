'use client';

import { createContext, use, useState, useCallback, useMemo, type ReactNode } from 'react';

interface ExploreNavContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const ExploreNavContext = createContext<ExploreNavContextValue | null>(null);

export function ExploreNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);

  const toggle = useCallback(() => setOpenState((prev) => !prev), []);

  const value: ExploreNavContextValue = useMemo(
    () => ({
      open,
      setOpen: setOpenState,
      toggle,
    }),
    [open, toggle],
  );

  return <ExploreNavContext.Provider value={value}>{children}</ExploreNavContext.Provider>;
}

export function useExploreNav(): ExploreNavContextValue {
  const ctx = use(ExploreNavContext);
  if (!ctx) {
    throw new Error('useExploreNav must be used inside <ExploreNavProvider>');
  }
  return ctx;
}
