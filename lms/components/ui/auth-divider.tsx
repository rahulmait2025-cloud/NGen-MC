'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

export function AuthDivider({
  children,
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('relative flex w-full items-center', className)} {...props}>
      <div className="w-full border-t border-border/60" />
      <div className="flex w-max justify-center text-nowrap px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {children}
      </div>
      <div className="w-full border-t border-border/60" />
    </div>
  );
}
