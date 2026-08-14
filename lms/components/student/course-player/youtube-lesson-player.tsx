'use client';

interface YouTubeLessonPlayerProps {
  videoId: string;
  embedUrl: string;
  title: string;
}

export function YouTubeLessonPlayer({ embedUrl, title }: YouTubeLessonPlayerProps) {
  return (
    <div className="relative aspect-video w-full bg-black">
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
