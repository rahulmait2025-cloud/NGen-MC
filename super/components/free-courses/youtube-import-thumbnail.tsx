'use client';

import { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getYouTubeThumbnailCandidates } from '@/lib/utils/youtube-thumbnail';
import { cn } from '@/lib/utils';

interface YouTubeImportThumbnailProps {
  videoId: string;
  thumbnailUrl?: string | null;
  title?: string;
  unavailable?: boolean;
  className?: string;
}

function YouTubeImportThumbnailInner({
  videoId,
  thumbnailUrl,
  title = '',
  unavailable = false,
  className,
}: YouTubeImportThumbnailProps) {
  const candidates = useMemo(
    () => (unavailable ? [] : getYouTubeThumbnailCandidates(videoId, thumbnailUrl)),
    [videoId, thumbnailUrl, unavailable],
  );

  const [index, setIndex] = useState(0);

  const src = candidates[index] ?? null;
  const exhausted = index >= candidates.length;

  if (unavailable || !videoId || exhausted || !src) {
    return (
      <div
        className={cn(
          'flex size-full min-h-[54px] min-w-[96px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/50 text-muted-foreground',
          className,
        )}
        title={unavailable ? 'Video unavailable' : 'No thumbnail'}
      >
        <ImageOff className="size-4 opacity-60" aria-hidden />
        <span className="mt-1 text-[9px] font-medium uppercase tracking-wide">
          {unavailable ? 'Unavailable' : 'No thumbnail'}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external YouTube CDN thumbnail, fallback chain not optimizable
    <img
      key={`${videoId}-${index}`}
      src={src}
      alt={title ? `Thumbnail for ${title}` : 'Video thumbnail'}
      width={112}
      height={64}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn('size-full rounded-md border object-cover', className)}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export function YouTubeImportThumbnail(props: YouTubeImportThumbnailProps) {
  const resetKey = `${props.videoId}|${props.thumbnailUrl ?? ''}|${props.unavailable ? '1' : '0'}`;
  return <YouTubeImportThumbnailInner key={resetKey} {...props} />;
}
