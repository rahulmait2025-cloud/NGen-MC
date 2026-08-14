import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface LandingSectionShellProps {
  children: ReactNode;
  className?: string;
  id?: string;
  alternateBg?: boolean;
}

export function LandingSectionShell({ children, className, id, alternateBg }: LandingSectionShellProps) {
  return (
    <section
      id={id}
      className={cn(
        'landing-section relative w-full',
        alternateBg && 'bg-[var(--landing-bg-soft)]',
        className
      )}
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block" aria-hidden="true">
        <div className="absolute -left-1/4 -top-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[var(--landing-orange)]/5 to-transparent opacity-30" />
        <div className="absolute -right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-[var(--landing-accent-teal)]/5 to-transparent opacity-30" />
      </div>
    </section>
  );
}
