'use client';

import React, { createContext, useMemo } from 'react';

export type OpenDrawerContextValue = {
  openDrawer: () => void;
};

const OpenDrawerContext = createContext<OpenDrawerContextValue | null>(null);

export function OpenDrawerProvider({
  openDrawer,
  children,
}: {
  openDrawer: () => void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ openDrawer }), [openDrawer]);
  return (
    <OpenDrawerContext.Provider value={value}>
      {children}
    </OpenDrawerContext.Provider>
  );
}
