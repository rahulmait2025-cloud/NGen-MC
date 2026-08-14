'use client';

import React from 'react';
import { useCoursePlayer } from './context';

interface PlaylistSearchProps {
  searchResultCount: number;
}

export function PlaylistSearch({ searchResultCount }: PlaylistSearchProps) {
  const { playlistSearch } = useCoursePlayer();

  if (!playlistSearch.trim()) return null;

  return (
    <p className="mt-1.5 text-[13px] text-slate-500 dark:text-white/48">
      {searchResultCount} {searchResultCount === 1 ? 'lesson' : 'lessons'}
    </p>
  );
}
