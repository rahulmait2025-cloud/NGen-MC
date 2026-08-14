import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getFreeYoutubeVideoCompletionIds({
  studentId,
  playlistId,
}: {
  studentId: string;
  playlistId: string;
}): Promise<string[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('free_youtube_video_completions')
    .select('youtube_video_id')
    .eq('student_id', studentId)
    .eq('playlist_id', playlistId);

  if (error) {
    throw new Error(`Failed to load playlist completions: ${error.message}`);
  }

  return (data ?? []).map((row) => row.youtube_video_id);
}

export async function markFreeYoutubeVideoComplete(input: {
  studentId: string;
  collegeId: string | null;
  playlistId: string;
  youtubeVideoId: string;
  videoTitle: string | null;
}): Promise<void> {
  const sb = createAdminClient();

  const { error } = await sb.from('free_youtube_video_completions').upsert(
    {
      student_id: input.studentId,
      college_id: input.collegeId,
      playlist_id: input.playlistId,
      youtube_video_id: input.youtubeVideoId,
      video_title: input.videoTitle,
    },
    { onConflict: 'student_id,playlist_id,youtube_video_id', ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`Failed to mark video complete: ${error.message}`);
  }
}
