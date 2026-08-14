'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { TpStreamsPlayerRef } from '@/components/student/tpstreams-player';

const BaseTpStreamsPlayer = dynamic(
  () => import('@/components/student/tpstreams-player').then((m) => m.TpStreamsPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video flex items-center justify-center bg-zinc-950">
        <div className="animate-spin"><Loader2 className="size-12 text-primary/40" /></div>
      </div>
    ),
  }
);

import type { VideoContentProtectionType } from '@/types/student-runtime';

interface TPStreamsPlayerProps {
  playerRef: React.RefObject<TpStreamsPlayerRef | null>;
  collegeSlug: string;
  studentId: string;
  courseId: string;
  itemId: string;
  moduleId: string | null;
  learnVariantId: string | null;
  videoAssetId: string;
  contentProtectionType?: VideoContentProtectionType;
  embedUrl: string;
  playbackToken?: string;
  resumePosition: number;
  onComplete: () => void;
  onRefresh: () => void;
  currentTime: number;
  setCurrentTime: (time: number, duration: number) => void;
  seekPlayer: (time: number) => void;
}

export function TPStreamsPlayer({
  playerRef,
  collegeSlug,
  studentId,
  courseId,
  itemId,
  moduleId,
  learnVariantId,
  videoAssetId,
  contentProtectionType,
  embedUrl,
  playbackToken,
  resumePosition,
  onComplete,
  onRefresh,
  setCurrentTime,
  seekPlayer: _seekPlayer,
}: TPStreamsPlayerProps) {
  return (
    <BaseTpStreamsPlayer
      key="tpstreams-player-surface"
      ref={playerRef}
      collegeSlug={collegeSlug}
      studentId={studentId}
      courseId={courseId}
      itemId={itemId}
      moduleId={moduleId ?? undefined}
      videoAssetId={videoAssetId}
      contentProtectionType={contentProtectionType}
      learnVariantId={learnVariantId}
      embedUrl={embedUrl}
      playbackToken={playbackToken}
      initialPosition={resumePosition}
      onComplete={onComplete}
      onRefresh={onRefresh}
      onTimeUpdate={setCurrentTime}
      className="rounded-none border-0 shadow-none"
    />
  );
}
