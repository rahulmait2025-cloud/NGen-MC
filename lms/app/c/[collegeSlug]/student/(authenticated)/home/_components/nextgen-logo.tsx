import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BRAND_ASSETS } from '@/lib/brand/assets';

interface NextGenLogoProps {
  href?: string;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'transparent';
}

export function NextGenLogo({
  href,
  className,
  iconClassName,
  wordmarkClassName,
  size = 'md',
  variant = 'default',
}: NextGenLogoProps) {
  const iconSize = size === 'lg' ? 56 : size === 'sm' ? 32 : 36;

  const content = (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', size === 'lg' && 'gap-3.5', className)}>
      <span
        className={cn(
          'relative shrink-0 overflow-hidden rounded-lg',
          variant === 'default' &&
            'bg-zinc-900 ring-1 ring-zinc-800/80 shadow-sm dark:bg-white/10 dark:ring-white/15',
          size === 'lg' ? 'size-14 rounded-xl' : size === 'sm' ? 'size-8' : 'size-9',
          iconClassName,
        )}
      >
        <Image
          src={BRAND_ASSETS.logoIcon}
          alt="NextGen CTO"
          width={iconSize}
          height={iconSize}
          className="object-contain p-0.5"
          priority={size === 'lg'}
        />
      </span>
      <span
        className={cn(
          'truncate font-semibold tracking-tight landing-heading',
          size === 'lg' ? 'text-2xl sm:text-3xl' : size === 'sm' ? 'text-base' : 'text-lg sm:text-xl',
          wordmarkClassName,
        )}
      >
        NextGen<span className="font-bold text-primary">CTO</span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        {content}
      </Link>
    );
  }

  return content;
}
