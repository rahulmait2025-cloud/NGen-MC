'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

interface HeaderTitleContextValue {
  title: string | null;
  setTitle: (title: string | null) => void;
}

const HeaderTitleContext = createContext<HeaderTitleContextValue | null>(null);

export function HeaderTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);

  const value = useMemo(() => ({ title, setTitle }), [title, setTitle]);

  return (
    <HeaderTitleContext.Provider value={value}>
      {children}
    </HeaderTitleContext.Provider>
  );
}

export function useHeaderTitle() {
  const context = useContext(HeaderTitleContext);
  if (!context) {
    throw new Error('useHeaderTitle must be used within a HeaderTitleProvider');
  }
  return context;
}
