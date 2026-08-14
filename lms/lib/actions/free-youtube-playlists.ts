'use server';

import { revalidatePath } from 'next/cache';

import { getPlaylistVideos } from '@/lib/actions/youtube';
import { requireAuth } from '@/lib/auth/require-student-action';
import {
  markFreeYoutubeVideoComplete,
} from '@/lib/services/free-youtube-playlists';

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export type MarkFreeYoutubeVideoDoneInput = {
  collegeSlug: string;
  playlistId: string;
  youtubeVideoId: string;
  videoTitle?: string;
};

export type MarkFreeYoutubeVideoDoneResult =
  | { ok: true; youtubeVideoId: string }
  | { ok: false; error: string };

export async function markFreeYoutubeVideoDoneAction(
  input: MarkFreeYoutubeVideoDoneInput,
): Promise<MarkFreeYoutubeVideoDoneResult> {
  const collegeSlug = input.collegeSlug?.trim();
  const playlistId = input.playlistId?.trim();
  const youtubeVideoId = input.youtubeVideoId?.trim();

  if (!collegeSlug || !playlistId || !youtubeVideoId) {
    return { ok: false, error: 'Invalid completion request.' };
  }

  if (!YOUTUBE_VIDEO_ID_PATTERN.test(youtubeVideoId)) {
    return { ok: false, error: 'Invalid video id.' };
  }

  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const studentId = auth.studentId;
    const playlistVideos = await getPlaylistVideos(playlistId);
    if (playlistVideos.length > 0) {
      const inPlaylist = playlistVideos.some((video) => video.videoId === youtubeVideoId);
      if (!inPlaylist) {
        return { ok: false, error: 'This video is not part of the playlist.' };
      }
    }

    const matchedVideo = playlistVideos.find((video) => video.videoId === youtubeVideoId);
    const videoTitle = matchedVideo?.title ?? input.videoTitle?.trim() ?? null;

    await markFreeYoutubeVideoComplete({
      studentId,
      collegeId: isGlobal ? null : auth.tenant.id,
      playlistId,
      youtubeVideoId,
      videoTitle,
    });
  } catch (error) {
    console.error('[markFreeYoutubeVideoDoneAction]', error);
    const message = error instanceof Error ? error.message : 'Could not save completion.';
    if (message.includes('free_youtube_video_completions') || message.includes('does not exist')) {
      return { ok: false, error: 'Progress tracking is unavailable. Contact support if this persists.' };
    }
    return { ok: false, error: 'Could not save completion. Please try again.' };
  }

  const watchPath = `/c/${encodeURIComponent(collegeSlug)}/student/courses/youtube/${encodeURIComponent(playlistId)}`;
  revalidatePath(watchPath, 'page');

  return { ok: true, youtubeVideoId };
}
