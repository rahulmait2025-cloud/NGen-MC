import React from 'react';
import { cn } from '@/lib/utils';

interface LandingSectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}

export function LandingSectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: LandingSectionHeaderProps) {
  return (
    <div
      className={cn(
        'space-y-3',
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
        className,
      )}
    >
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-[0.06em] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="text-[var(--landing-h2-size)] font-bold tracking-tight leading-[var(--landing-h2-leading)] text-foreground">
        {title}
      </h2>
      {description && (
        <p className="text-[var(--landing-body-size)] leading-[var(--landing-body-leading)] text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
