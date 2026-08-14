import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { YouTubeEnrollmentGate } from '@/components/student/youtube-enrollment-gate';
import { YouTubePlaylistPlayer } from '@/components/student/youtube-playlist-player';
import { requireStudent } from '@/lib/auth/require-student';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFreeYoutubeVideoCompletionIds } from '@/lib/services/free-youtube-playlists';

export default async function YouTubePlaylistWatchPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; playlistId: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, playlistId: playlistParam } = await params;
  const { studentId, isGlobal, tenant } = await requireStudent(collegeSlug);
  const _collegeId = isGlobal ? null : tenant.id;

  const playlistId = decodeURIComponent(playlistParam);
  const sb = createAdminClient();

  const { data: item } = await sb
    .from('master_course_items')
    .select('master_course_id, youtube_original_title, youtube_thumbnail_url')
    .eq('youtube_playlist_id', playlistId)
    .not('youtube_playlist_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!item) notFound();

  const { data: course } = await sb
    .from('master_courses')
    .select('id, title, publish_status, course_kind')
    .eq('id', item.master_course_id)
    .eq('publish_status', 'published')
    .single();

  if (!course) notFound();

  const { data: entitlement } = await sb
    .from('student_entitlements')
    .select('id')
    .eq('student_id', studentId)
    .eq('master_course_id', course.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!entitlement) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <YouTubeEnrollmentGate
          collegeSlug={collegeSlug}
          courseId={course.id}
          title={item.youtube_original_title || course.title}
          thumbnail={item.youtube_thumbnail_url}
        />
      </div>
    );
  }

  const initialCompletedVideoIds = await getFreeYoutubeVideoCompletionIds({
    studentId,
    playlistId,
  });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <YouTubePlaylistPlayer
        key={playlistId}
        collegeSlug={collegeSlug}
        playlistId={playlistId}
        initialTitle={item.youtube_original_title || course.title}
        defaultPlaylistOpen
        initialCompletedVideoIds={initialCompletedVideoIds}
      />
    </div>
  );
}
