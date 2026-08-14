import type { ReactNode } from 'react';

export { BentoCardBody } from './bento-card-body';

export function BentoCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 max-w-full overflow-hidden rounded-[2.5rem] border border-border bg-card text-card-foreground shadow-sm dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}
