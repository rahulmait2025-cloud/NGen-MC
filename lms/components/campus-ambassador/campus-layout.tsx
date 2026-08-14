import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function CampusSection({
  children,
  className,
  id,
  fullWidth = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  fullWidth?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        'campus-section campus-reveal',
        fullWidth ? 'w-full' : undefined,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CampusContainer({
  children,
  className,
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 md:px-8',
        narrow ? 'max-w-4xl' : 'max-w-[1240px]',
        className,
      )}
    >
      {children}
    </div>
  );
}
