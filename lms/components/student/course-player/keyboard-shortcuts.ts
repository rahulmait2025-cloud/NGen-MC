'use client';

import { useEffect } from 'react';
import type { TpStreamsPlayerRef } from '@/components/student/tpstreams-player';

interface KeyboardShortcutOptions {
  playerRef: React.RefObject<TpStreamsPlayerRef | null>;
  prevLesson?: { id: string; href: string } | null;
  nextLesson?: { id: string; href: string } | null;
  navigateToLesson?: (id: string, href: string) => void;
  videoContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function useKeyboardShortcuts({
  playerRef,
  prevLesson,
  nextLesson,
  navigateToLesson,
  videoContainerRef,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in inputs or contentEditable
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (target?.isContentEditable) return;

      const player = playerRef.current;
      if (!player) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.getCurrentTime().then((t) => player.seekTo(Math.max(0, t - 5)));
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.getCurrentTime().then((t) => player.seekTo(t + 5));
          break;
        case 'j':
          e.preventDefault();
          player.getCurrentTime().then((t) => player.seekTo(Math.max(0, t - 10)));
          break;
        case 'l':
          e.preventDefault();
          player.getCurrentTime().then((t) => player.seekTo(t + 10));
          break;
        case '0':
        case 'Home':
          e.preventDefault();
          player.seekTo(0);
          break;
        case 'End':
          e.preventDefault();
          player.getCurrentTime().then((t) => {
            player.seekTo(t + 99999);
          });
          break;
        case 'f':
          e.preventDefault();
          {
            // Fullscreen the video container, not the entire page
            const container = videoContainerRef?.current;
            if (container) {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                container.requestFullscreen();
              }
            } else {
              // Fallback to page fullscreen if no container ref
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            }
          }
          break;
        case 'n':
          if (e.shiftKey && nextLesson && navigateToLesson) {
            e.preventDefault();
            navigateToLesson(nextLesson.id, nextLesson.href);
          }
          break;
        case 'p':
          if (e.shiftKey && prevLesson && navigateToLesson) {
            e.preventDefault();
            navigateToLesson(prevLesson.id, prevLesson.href);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerRef, prevLesson, nextLesson, navigateToLesson, videoContainerRef]);
}
