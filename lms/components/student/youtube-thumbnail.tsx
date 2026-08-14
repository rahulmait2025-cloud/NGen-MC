'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Youtube } from 'lucide-react';

import { cn } from '@/lib/utils';

type YouTubeThumbnailProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  /** Parent must be `relative` with defined size or aspect ratio */
  fill?: boolean;
  width?: number;
  height?: number;
  fallbackClassName?: string;
  iconClassName?: string;
};

export function YouTubeThumbnail({
  src,
  alt = '',
  className,
  fill = false,
  width,
  height,
  fallbackClassName,
  iconClassName,
}: YouTubeThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const trimmedSrc = src?.trim() ?? '';
  const showImage = trimmedSrc.length > 0 && !failed;

  const fallback = (
    <div
      className={cn(
        'flex items-center justify-center bg-gradient-to-br from-primary/[0.08] via-orange-50/90 to-amber-50/70 dark:from-primary/15 dark:via-background dark:to-muted/50',
        fill ? 'absolute inset-0 size-full' : 'size-full min-h-full min-w-full',
        fallbackClassName,
      )}
      aria-hidden={alt ? undefined : true}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15 sm:size-12 sm:rounded-2xl">
        <Youtube className={cn('size-5 text-red-500 sm:size-6', iconClassName)} aria-hidden />
      </span>
    </div>
  );

  if (!showImage) {
    return fallback;
  }

  if (fill) {
    return (
      <Image
        src={trimmedSrc}
        alt={alt}
        fill
        className={cn('object-cover', className)}
        sizes="(max-width: 768px) 100vw, 50vw"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={trimmedSrc}
      alt={alt}
      width={width ?? 320}
      height={height ?? 180}
      className={cn('object-cover', className)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
