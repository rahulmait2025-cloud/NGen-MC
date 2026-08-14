'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BRAND_ASSETS } from '@/lib/brand/assets';

interface FounderAvatarProps {
  className?: string;
  imageClassName?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  /** Override default founder image (e.g. auth hero portrait). */
  src?: string;
}

export function FounderAvatar({
  className,
  imageClassName,
  fill = false,
  width = 400,
  height = 400,
  sizes = '(max-width: 768px) 256px, 320px',
  priority = false,
  src = BRAND_ASSETS.founderImage,
}: FounderAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary',
          fill ? 'absolute inset-0 w-full h-full' : '',
          className,
        )}
        aria-label="CTO Bhaiya — Founder, NextGen CTO"
      >
        <span className="font-display text-5xl font-black tracking-tight">CB</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt="CTO Bhaiya — Founder, NextGen CTO"
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      priority={priority}
      unoptimized
      className={cn('object-cover', imageClassName)}
      onError={() => setFailed(true)}
    />
  );
}
