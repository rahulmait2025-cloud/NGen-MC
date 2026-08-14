'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type StudentCtaVariant = 'primary' | 'secondary' | 'ghost';
export type StudentCtaSize = 'default' | 'lg';

const VARIANT_STYLES: Record<StudentCtaVariant, string> = {
  primary: cn(
    'group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-6 py-3.5',
    'font-semibold text-white',
    'bg-orange-500 border border-orange-400/80',
    'shadow-[0_14px_32px_rgba(249,115,22,0.25)]',
    'transition duration-200',
    'hover:bg-orange-400 hover:-translate-y-0.5',
    'hover:shadow-[0_18px_42px_rgba(249,115,22,0.32)]',
    'active:translate-y-0',
  ),
  secondary: cn(
    'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5',
    'font-semibold text-foreground dark:text-white',
    'border border-border bg-foreground/[0.03] dark:bg-white/[0.07]',
    'shadow-[0_12px_28px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.25)]',
    'transition duration-200',
    'hover:border-orange-400/45 hover:bg-orange-500/15 hover:text-orange-500 dark:hover:text-white',
    'hover:-translate-y-0.5 active:translate-y-0',
  ),
  ghost: cn(
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5',
    'font-medium text-muted-foreground',
    'transition duration-200',
    'hover:bg-white/[0.06] hover:text-orange-100',
  ),
};

const SIZE_STYLES: Record<StudentCtaSize, string> = {
  default: 'min-h-11 text-sm',
  lg: 'min-h-14 px-8 py-4 text-base',
};

export interface StudentCtaButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'variant' | 'size'> {
  href?: string;
  variant?: StudentCtaVariant;
  size?: StudentCtaSize;
  showArrow?: boolean;
  external?: boolean;
}

export function StudentCtaButton({
  href,
  variant = 'primary',
  size = 'default',
  showArrow = true,
  external = false,
  className,
  children,
  asChild,
  ...props
}: StudentCtaButtonProps) {
  const styles = cn(
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    'h-auto w-auto',
    className,
  );

  const content = (
    <>
      {children}
      {showArrow && variant === 'primary' ? (
        <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
      ) : null}
    </>
  );

  if (href) {
    if (external) {
      return (
        <Button asChild className={styles} {...props}>
          <a href={href} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        </Button>
      );
    }

    return (
      <Button asChild className={styles} {...props}>
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  if (asChild) {
    return (
      <Button asChild className={styles} {...props}>
        {children}
      </Button>
    );
  }

  return (
    <Button className={styles} {...props}>
      {content}
    </Button>
  );
}
