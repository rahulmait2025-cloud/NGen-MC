"use client";

import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';

export function LenisProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        // Let overflow:auto panels (dialogs, sidebars) receive wheel events natively
        allowNestedScroll: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
