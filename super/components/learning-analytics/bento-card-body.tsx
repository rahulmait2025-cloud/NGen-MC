import type { ReactNode } from 'react';

export function BentoCardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'min-w-0 p-4 sm:p-6 lg:p-8 ' + className}>{children}</div>;
}
