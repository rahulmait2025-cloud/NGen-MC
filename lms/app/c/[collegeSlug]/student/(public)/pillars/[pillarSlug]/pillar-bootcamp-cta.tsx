'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type BootcampCtaState } from '@/lib/utils/bootcamp-cta';

interface BootcampCtaButtonProps {
  cta: BootcampCtaState;
  variant?: 'primary' | 'secondary';
  className?: string;
  size?: 'default' | 'lg';
}

export function BootcampCtaButton({
  cta,
  variant = 'primary',
  className,
  size = 'default',
}: BootcampCtaButtonProps) {
  const isHash = cta.href.startsWith('#');

  if (variant === 'secondary') {
    return (
      <div className={cn('flex flex-col items-center gap-1.5', className)}>
        <Button asChild variant="outline" size={size} className="rounded-full px-8">
          {isHash ? (
            <a href={cta.href}>{cta.label}</a>
          ) : (
            <Link href={cta.href}>{cta.label}</Link>
          )}
        </Button>
        {cta.showEligibility ? (
          <span className="text-[10px] text-muted-foreground">
            Access depends on college eligibility.
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <Button
        asChild
        size={size}
        className="rounded-full bg-primary px-8 font-semibold text-primary-foreground shadow-[0_0_28px_color-mix(in_oklab,var(--primary)_35%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {isHash ? (
          <a href={cta.href} className="inline-flex items-center gap-2">
            {cta.label}
            <ArrowRight className="size-4" />
          </a>
        ) : (
          <Link href={cta.href} className="inline-flex items-center gap-2">
            {cta.label}
            <ArrowRight className="size-4" />
          </Link>
        )}
      </Button>
      {cta.showEligibility ? (
        <span className="text-[10px] text-muted-foreground">
          Access depends on college eligibility.
        </span>
      ) : null}
    </div>
  );
}
