'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { youTubeEmbedUrl } from '@/lib/youtube/parse-video-url';

interface PaidCoursePreviewVideoProps {
  videoId: string;
  posterUrl: string;
  title: string;
  className?: string;
  playButtonClassName?: string;
  priority?: boolean;
}

export function PaidCoursePreviewVideo({
  videoId,
  posterUrl,
  title,
  className,
  playButtonClassName,
  priority = false,
}: PaidCoursePreviewVideoProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden bg-background', className)}>
        <iframe
          src={youTubeEmbedUrl(videoId, true)}
          title={`${title} preview`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={cn(
        'relative aspect-video w-full overflow-hidden text-left group cursor-pointer',
        className,
      )}
      aria-label={`Play preview video for ${title}`}
    >
      <Image
        src={posterUrl}
        alt={`${title} preview`}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        priority={priority}
      />
      <div className="absolute inset-0 bg-foreground/25 group-hover:bg-black/15 transition-colors flex items-center justify-center">
        <div
          className={cn(
            'size-20 bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-200',
            playButtonClassName,
          )}
        >
          <PlayCircle className="size-10 fill-white/20" />
        </div>
      </div>
    </button>
  );
}
