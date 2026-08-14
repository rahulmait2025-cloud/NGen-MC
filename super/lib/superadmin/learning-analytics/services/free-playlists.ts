import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { cacheLife, cacheTag } from 'next/cache';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import type {
  FreePlaylistAnalyticsDetail,
  FreePlaylistAnalyticsOverview,
  FreePlaylistDailyActivityRow,
  FreePlaylistDetailStudentRow,
  FreePlaylistEnrolledStudentRow,
  FreePlaylistFrequentWatcherRow,
  FreePlaylistPlaylistRow,
  FreePlaylistTopActiveRow,
} from '../types';
import {
  getAdminClient,
  loadColleges,
  loadProfiles,
  loadStudents,
  resolveStudentDisplay,
  toIsoOrNull,
} from './shared';

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;
const TREND_DAYS = 14;
const FREQUENT_WATCHER_DAYS = 14;
const FREQUENT_WATCHER_MIN_ACTIVE_DAYS = 3;
const TOP_ACTIVE_DAYS = 7;
const TOP_ACTIVE_LIMIT = 10;
const DETAIL_STUDENT_LIMIT = 200;

type EnrollmentRow = {
  student_id: string;
  college_id: string | null;
  playlist_id: string;
  playlist_title: string | null;
  playlist_thumbnail_url: string | null;
  enrolled_at: string;
};

type CompletionRow = {
  student_id: string;
  playlist_id: string;
  youtube_video_id: string;
  completed_at: string;
};

function isMissingFreeYoutubeTableError(error: { message?: string }): boolean {
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('free_youtube') &&
    (msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('could not find'))
  );
}

function startOfLocalDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTrendLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function buildEmptyDailyTrend(days: number): FreePlaylistDailyActivityRow[] {
  const rows: FreePlaylistDailyActivityRow[] = [];
  const today = startOfLocalDay();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const date = toLocalDateKey(day);
    rows.push({
      date,
      label: formatTrendLabel(date),
      completionCount: 0,
      uniqueStudents: 0,
      activePlaylists: 0,
    });
  }

  return rows;
}

function createEmptyOverview(loadError: string | null = null): FreePlaylistAnalyticsOverview {
  return {
    available: loadError === null,
    loadError,
    totalEnrollments: 0,
    totalUniqueStudents: 0,
    totalCompletions: 0,
    completionsToday: 0,
    totalFrequentWatchers: 0,
    enrollmentsByPlaylist: [],
    dailyCompletionTrend: buildEmptyDailyTrend(TREND_DAYS),
    topActivePlaylists: [],
    frequentWatchers: [],
  };
}

function createEmptyDetail(playlistId: string, loadError: string | null = null): FreePlaylistAnalyticsDetail {
  return {
    available: loadError === null,
    loadError,
    playlistId,
    playlistTitle: playlistId,
    playlistThumbnailUrl: null,
    totalEnrollments: 0,
    uniqueStudents: 0,
    totalCompletions: 0,
    completionsToday: 0,
    enrolledStudents: [],
  };
}

async function requireSuperAdminSession(): Promise<void> {
  await requireSuperadmin();
}

async function fetchEnrollmentRows(admin: SupabaseClient): Promise<EnrollmentRow[]> {
  const rows: EnrollmentRow[] = [];
  let offset = 0;

  // Bound to 30-day rolling window to prevent unbounded full-table scans
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceIso = thirtyDaysAgo.toISOString();

  while (offset < MAX_ROWS) {
    const { data, error } = await admin
      .from('free_youtube_playlist_enrollments')
      .select(
        'student_id, college_id, playlist_id, playlist_title, playlist_thumbnail_url, enrolled_at',
      )
      .gte('enrolled_at', sinceIso)
      .order('enrolled_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as EnrollmentRow[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function fetchCompletionRowsSince(
  admin: SupabaseClient,
  sinceIso: string,
): Promise<CompletionRow[]> {
  const rows: CompletionRow[] = [];
  let offset = 0;

  while (offset < MAX_ROWS) {
    const { data, error } = await admin
      .from('free_youtube_video_completions')
      .select('student_id, playlist_id, youtube_video_id, completed_at')
      .gte('completed_at', sinceIso)
      .order('completed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as CompletionRow[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function fetchAllCompletionRows(admin: SupabaseClient): Promise<CompletionRow[]> {
  const rows: CompletionRow[] = [];
  let offset = 0;

  // Bound to 30-day window to match enrollment window
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceIso = thirtyDaysAgo.toISOString();

  while (offset < MAX_ROWS) {
    const { data, error } = await admin
      .from('free_youtube_video_completions')
      .select('student_id, playlist_id, youtube_video_id, completed_at')
      .gte('completed_at', sinceIso)
      .order('completed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as CompletionRow[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function countCompletionsToday(admin: SupabaseClient): Promise<number> {
  const todayStart = startOfLocalDay();
  const { count, error } = await admin
    .from('free_youtube_video_completions')
    .select('*', { count: 'exact', head: true })
    .gte('completed_at', todayStart.toISOString());

  if (error) throw error;
  return count ?? 0;
}

function resolvePlaylistTitle(playlistId: string, enrollmentRows: EnrollmentRow[]): string {
  const enrollmentTitle = enrollmentRows.find(
    (row) => row.playlist_id === playlistId && row.playlist_title?.trim(),
  )?.playlist_title?.trim();
  if (enrollmentTitle) return enrollmentTitle;
  return playlistId;
}

function resolvePlaylistThumbnail(
  playlistId: string,
  enrollmentRows: EnrollmentRow[],
): string | null {
  return (
    enrollmentRows.find(
      (row) => row.playlist_id === playlistId && row.playlist_thumbnail_url?.trim(),
    )?.playlist_thumbnail_url?.trim() ?? null
  );
}

function buildDailyCompletionTrend(
  completionRows: CompletionRow[],
  days: number,
): FreePlaylistDailyActivityRow[] {
  const trend = buildEmptyDailyTrend(days);
  const trendStart = startOfLocalDay();
  trendStart.setDate(trendStart.getDate() - (days - 1));

  const byDate = new Map<
    string,
    { completionCount: number; students: Set<string>; playlists: Set<string> }
  >();

  for (const row of completionRows) {
    const completedAt = new Date(row.completed_at);
    if (Number.isNaN(completedAt.getTime())) continue;
    if (completedAt < trendStart) continue;

    const dateKey = toLocalDateKey(completedAt);
    const bucket = byDate.get(dateKey) ?? {
      completionCount: 0,
      students: new Set<string>(),
      playlists: new Set<string>(),
    };
    bucket.completionCount += 1;
    bucket.students.add(row.student_id);
    bucket.playlists.add(row.playlist_id);
    byDate.set(dateKey, bucket);
  }

  return trend.map((point) => {
    const bucket = byDate.get(point.date);
    if (!bucket) return point;
    return {
      ...point,
      completionCount: bucket.completionCount,
      uniqueStudents: bucket.students.size,
      activePlaylists: bucket.playlists.size,
    };
  });
}

function buildTopActivePlaylists(
  enrollmentRows: EnrollmentRow[],
  completionRows: CompletionRow[],
  days: number,
  limit: number,
): FreePlaylistTopActiveRow[] {
  const since = startOfLocalDay();
  since.setDate(since.getDate() - (days - 1));

  const completionCounts = new Map<string, number>();
  for (const row of completionRows) {
    const completedAt = new Date(row.completed_at);
    if (Number.isNaN(completedAt.getTime()) || completedAt < since) continue;
    completionCounts.set(row.playlist_id, (completionCounts.get(row.playlist_id) ?? 0) + 1);
  }

  const enrollmentCounts = new Map<string, number>();
  for (const row of enrollmentRows) {
    enrollmentCounts.set(row.playlist_id, (enrollmentCounts.get(row.playlist_id) ?? 0) + 1);
  }

  return [...completionCounts.entries()]
    .map(([playlistId, completionCount]) => ({
      playlistId,
      playlistTitle: resolvePlaylistTitle(playlistId, enrollmentRows),
      completionCount,
      enrollmentCount: enrollmentCounts.get(playlistId) ?? 0,
    }))
    .sort((a, b) => b.completionCount - a.completionCount)
    .slice(0, limit);
}

function buildFrequentWatchers(
  completionRows: CompletionRow[],
  students: Awaited<ReturnType<typeof loadStudents>>,
  profiles: Awaited<ReturnType<typeof loadProfiles>>,
  collegeNameById: Map<string, string>,
  days: number,
  minActiveDays: number,
): { totalFrequentWatchers: number; rows: FreePlaylistFrequentWatcherRow[] } {
  const since = startOfLocalDay();
  since.setDate(since.getDate() - (days - 1));

  const activeDaysByStudent = new Map<string, Set<string>>();

  for (const row of completionRows) {
    const completedAt = new Date(row.completed_at);
    if (Number.isNaN(completedAt.getTime()) || completedAt < since) continue;

    const dayKey = toLocalDateKey(completedAt);
    const daysSet = activeDaysByStudent.get(row.student_id) ?? new Set<string>();
    daysSet.add(dayKey);
    activeDaysByStudent.set(row.student_id, daysSet);
  }

  const studentById = new Map(students.map((student) => [student.id, student]));
  const frequentRows: FreePlaylistFrequentWatcherRow[] = [];

  for (const [studentId, daySet] of activeDaysByStudent.entries()) {
    if (daySet.size < minActiveDays) continue;
    const student = studentById.get(studentId);
    const display = student
      ? resolveStudentDisplay(student, profiles)
      : { name: 'Unknown student', email: '' };
    const collegeName = student?.college_id
      ? collegeNameById.get(student.college_id) ?? null
      : null;

    frequentRows.push({
      studentId,
      name: display.name,
      email: display.email,
      collegeName,
      activeDays: daySet.size,
    });
  }

  frequentRows.sort((a, b) => b.activeDays - a.activeDays);

  return {
    totalFrequentWatchers: frequentRows.length,
    rows: frequentRows.slice(0, 10),
  };
}

function buildPlaylistRows(
  enrollmentRows: EnrollmentRow[],
  allCompletions: CompletionRow[],
  recentCompletions: CompletionRow[],
  students: Awaited<ReturnType<typeof loadStudents>>,
  profiles: Awaited<ReturnType<typeof loadProfiles>>,
  collegeNameById: Map<string, string>,
): FreePlaylistPlaylistRow[] {
  const todayStart = startOfLocalDay();
  const playlistIds = new Set<string>();

  for (const row of enrollmentRows) playlistIds.add(row.playlist_id);
  for (const row of allCompletions) playlistIds.add(row.playlist_id);

  const studentById = new Map(students.map((student) => [student.id, student]));

  const completionStatsByPlaylist = new Map<
    string,
    Map<string, { count: number; lastCompletionAt: Date | null }>
  >();

  for (const row of allCompletions) {
    const playlistStats = completionStatsByPlaylist.get(row.playlist_id) ?? new Map();
    const existing = playlistStats.get(row.student_id) ?? { count: 0, lastCompletionAt: null };
    existing.count += 1;
    const completedAt = new Date(row.completed_at);
    if (!Number.isNaN(completedAt.getTime())) {
      if (!existing.lastCompletionAt || completedAt > existing.lastCompletionAt) {
        existing.lastCompletionAt = completedAt;
      }
    }
    playlistStats.set(row.student_id, existing);
    completionStatsByPlaylist.set(row.playlist_id, playlistStats);
  }

  const rows: FreePlaylistPlaylistRow[] = [];

  // Pre-build Maps keyed by playlist_id to avoid O(N²) filter loops
  const enrollmentsByPlaylist = new Map<string, EnrollmentRow[]>();
  for (const row of enrollmentRows) {
    const list = enrollmentsByPlaylist.get(row.playlist_id) ?? [];
    list.push(row);
    enrollmentsByPlaylist.set(row.playlist_id, list);
  }

  const completionsByPlaylist = new Map<string, CompletionRow[]>();
  for (const row of allCompletions) {
    const list = completionsByPlaylist.get(row.playlist_id) ?? [];
    list.push(row);
    completionsByPlaylist.set(row.playlist_id, list);
  }

  const recentByPlaylist = new Map<string, CompletionRow[]>();
  for (const row of recentCompletions) {
    const list = recentByPlaylist.get(row.playlist_id) ?? [];
    list.push(row);
    recentByPlaylist.set(row.playlist_id, list);
  }

  for (const playlistId of playlistIds) {
    const playlistEnrollments = enrollmentsByPlaylist.get(playlistId) ?? [];
    const playlistCompletions = completionsByPlaylist.get(playlistId) ?? [];
    const recentForPlaylist = recentByPlaylist.get(playlistId) ?? [];
    const completionsToday = recentForPlaylist.filter((row) => {
      const completedAt = new Date(row.completed_at);
      return !Number.isNaN(completedAt.getTime()) && completedAt >= todayStart;
    }).length;

    const uniqueStudents = new Set(playlistEnrollments.map((row) => row.student_id)).size;
    let lastEnrollmentAt: Date | null = null;
    for (const row of playlistEnrollments) {
      const enrolledAt = new Date(row.enrolled_at);
      if (Number.isNaN(enrolledAt.getTime())) continue;
      if (!lastEnrollmentAt || enrolledAt > lastEnrollmentAt) lastEnrollmentAt = enrolledAt;
    }

    let lastCompletionAt: Date | null = null;
    for (const row of playlistCompletions) {
      const completedAt = new Date(row.completed_at);
      if (Number.isNaN(completedAt.getTime())) continue;
      if (!lastCompletionAt || completedAt > lastCompletionAt) lastCompletionAt = completedAt;
    }

    const titleRow = playlistEnrollments.find((row) => row.playlist_title?.trim());
    const thumbRow = playlistEnrollments.find((row) => row.playlist_thumbnail_url?.trim());

    const playlistCompletionStats = completionStatsByPlaylist.get(playlistId) ?? new Map();
    const enrolledStudents: FreePlaylistEnrolledStudentRow[] = playlistEnrollments
      .map((enrollment) => {
        const student = studentById.get(enrollment.student_id);
        const display = student
          ? resolveStudentDisplay(student, profiles)
          : { name: 'Unknown student', email: '' };
        const collegeName = enrollment.college_id
          ? collegeNameById.get(enrollment.college_id) ?? null
          : student?.college_id
            ? collegeNameById.get(student.college_id) ?? null
            : null;
        const stats = playlistCompletionStats.get(enrollment.student_id);

        return {
          studentId: enrollment.student_id,
          name: display.name,
          email: display.email,
          collegeName,
          enrolledAt: enrollment.enrolled_at,
          completedVideosCount: stats?.count ?? 0,
          lastCompletionAt: toIsoOrNull(stats?.lastCompletionAt ?? null),
        };
      })
      .sort((a, b) => {
        const aDate = new Date(a.enrolledAt).getTime() ?? 0;
        const bDate = new Date(b.enrolledAt).getTime() ?? 0;
        return bDate - aDate;
      })
      .slice(0, DETAIL_STUDENT_LIMIT);

    rows.push({
      playlistId,
      playlistTitle: titleRow?.playlist_title?.trim() || playlistId,
      playlistThumbnailUrl: thumbRow?.playlist_thumbnail_url?.trim() ?? null,
      totalEnrollments: playlistEnrollments.length,
      uniqueStudents,
      totalCompletions: playlistCompletions.length,
      completionsToday,
      lastEnrollmentAt: toIsoOrNull(lastEnrollmentAt),
      lastCompletionAt: toIsoOrNull(lastCompletionAt),
      enrolledStudents,
    });
  }

  return rows.sort((a, b) => {
    const aActivity = Math.max(
      a.lastCompletionAt ? new Date(a.lastCompletionAt).getTime() : 0,
      a.lastEnrollmentAt ? new Date(a.lastEnrollmentAt).getTime() : 0,
    );
    const bActivity = Math.max(
      b.lastCompletionAt ? new Date(b.lastCompletionAt).getTime() : 0,
      b.lastEnrollmentAt ? new Date(b.lastEnrollmentAt).getTime() : 0,
    );
    if (bActivity !== aActivity) return bActivity - aActivity;
    return b.totalEnrollments - a.totalEnrollments;
  });
}

export async function getFreePlaylistAnalyticsOverview(): Promise<FreePlaylistAnalyticsOverview> {
  await requireSuperAdminSession();
  return _getFreePlaylistAnalyticsOverviewCached();
}

async function _getFreePlaylistAnalyticsOverviewCached(): Promise<FreePlaylistAnalyticsOverview> {
  'use cache';
  cacheLife('minutes');
  cacheTag('free-playlist-analytics');

  const admin = getAdminClient();

  try {
    const trendSince = startOfLocalDay();
    trendSince.setDate(trendSince.getDate() - (TREND_DAYS - 1));
    const frequentSince = startOfLocalDay();
    frequentSince.setDate(frequentSince.getDate() - (FREQUENT_WATCHER_DAYS - 1));
    const fetchSince = frequentSince < trendSince ? frequentSince : trendSince;

    const [enrollmentRows, allCompletions, recentCompletions, completionsToday, colleges, students] =
      await Promise.all([
        fetchEnrollmentRows(admin),
        fetchAllCompletionRows(admin),
        fetchCompletionRowsSince(admin, fetchSince.toISOString()),
        countCompletionsToday(admin),
        loadColleges(admin),
        loadStudents(admin),
      ]);

    const totalUniqueStudents = new Set(enrollmentRows.map((row) => row.student_id)).size;
    const collegeNameById = new Map(colleges.map((college) => [college.id, college.name]));
    const profiles = await loadProfiles(
      admin,
      [...new Set(students.map((student) => student.user_id))],
    );

    const frequent = buildFrequentWatchers(
      recentCompletions,
      students,
      profiles,
      collegeNameById,
      FREQUENT_WATCHER_DAYS,
      FREQUENT_WATCHER_MIN_ACTIVE_DAYS,
    );

    return {
      available: true,
      loadError: null,
      totalEnrollments: enrollmentRows.length,
      totalUniqueStudents,
      totalCompletions: allCompletions.length,
      completionsToday,
      totalFrequentWatchers: frequent.totalFrequentWatchers,
      enrollmentsByPlaylist: buildPlaylistRows(enrollmentRows, allCompletions, recentCompletions, students, profiles, collegeNameById),
      dailyCompletionTrend: buildDailyCompletionTrend(recentCompletions, TREND_DAYS),
      topActivePlaylists: buildTopActivePlaylists(
        enrollmentRows,
        recentCompletions,
        TOP_ACTIVE_DAYS,
        TOP_ACTIVE_LIMIT,
      ),
      frequentWatchers: frequent.rows,
    };
  } catch (error) {
    if (error && typeof error === 'object' && isMissingFreeYoutubeTableError(error as { message?: string })) {
      return createEmptyOverview('Free playlist tracking tables are not available yet.');
    }

    console.error('[getFreePlaylistAnalyticsOverview]', error);
    return createEmptyOverview('Could not load free playlist analytics.');
  }
}

export async function getFreePlaylistAnalyticsDetail(
  playlistIdParam: string,
): Promise<FreePlaylistAnalyticsDetail> {
  await requireSuperAdminSession();
  const playlistId = decodeURIComponent(playlistIdParam).trim();
  if (!playlistId) {
    return createEmptyDetail(playlistIdParam, 'Invalid playlist id.');
  }

  const admin = getAdminClient();

  try {
    const todayStart = startOfLocalDay();

    const { data: enrollmentData, error: enrollmentError } = await admin
      .from('free_youtube_playlist_enrollments')
      .select(
        'student_id, college_id, playlist_id, playlist_title, playlist_thumbnail_url, enrolled_at',
      )
      .eq('playlist_id', playlistId)
      .order('enrolled_at', { ascending: false })
      .limit(DETAIL_STUDENT_LIMIT);

    if (enrollmentError) throw enrollmentError;

    const enrollmentRows = (enrollmentData ?? []) as EnrollmentRow[];
    if (enrollmentRows.length === 0) {
      return createEmptyDetail(playlistId);
    }

    const { data: completionData, error: completionError } = await admin
      .from('free_youtube_video_completions')
      .select('student_id, playlist_id, youtube_video_id, completed_at')
      .eq('playlist_id', playlistId);

    if (completionError) throw completionError;

    const completionRows = (completionData ?? []) as CompletionRow[];
    const completionsToday = completionRows.filter((row) => {
      const completedAt = new Date(row.completed_at);
      return !Number.isNaN(completedAt.getTime()) && completedAt >= todayStart;
    }).length;

    const studentIds = [...new Set(enrollmentRows.map((row) => row.student_id))];
    const collegeIds = [
      ...new Set(
        enrollmentRows.map((row) => row.college_id).filter((id): id is string => Boolean(id)),
      ),
    ];

    const [studentsResult, collegesResult] = await Promise.all([
      admin.from('students').select('id, user_id, college_id').in('id', studentIds),
      collegeIds.length > 0
        ? admin.from('colleges').select('id, name').in('id', collegeIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (collegesResult.error) throw collegesResult.error;

    const students = (studentsResult.data ?? []) as Array<{
      id: string;
      user_id: string;
      college_id: string;
    }>;
    const profiles = await loadProfiles(admin, students.map((student) => student.user_id));
    const collegeNameById = new Map(
      ((collegesResult.data ?? []) as Array<{ id: string; name: string }>).map((college) => [
        college.id,
        college.name,
      ]),
    );
    const studentById = new Map(students.map((student) => [student.id, student]));

    const completionStats = new Map<
      string,
      { count: number; lastCompletionAt: Date | null }
    >();

    for (const row of completionRows) {
      const existing = completionStats.get(row.student_id) ?? {
        count: 0,
        lastCompletionAt: null,
      };
      existing.count += 1;
      const completedAt = new Date(row.completed_at);
      if (!Number.isNaN(completedAt.getTime())) {
        if (!existing.lastCompletionAt || completedAt > existing.lastCompletionAt) {
          existing.lastCompletionAt = completedAt;
        }
      }
      completionStats.set(row.student_id, existing);
    }

    const enrolledStudents: FreePlaylistDetailStudentRow[] = enrollmentRows.map((enrollment) => {
      const student = studentById.get(enrollment.student_id);
      const display = student
        ? resolveStudentDisplay(student, profiles)
        : { name: 'Unknown student', email: '' };
      const collegeName = enrollment.college_id
        ? collegeNameById.get(enrollment.college_id) ?? null
        : student?.college_id
          ? collegeNameById.get(student.college_id) ?? null
          : null;
      const stats = completionStats.get(enrollment.student_id);

      return {
        studentId: enrollment.student_id,
        name: display.name,
        email: display.email,
        collegeName,
        enrolledAt: enrollment.enrolled_at,
        completedVideosCount: stats?.count ?? 0,
        lastCompletionAt: toIsoOrNull(stats?.lastCompletionAt ?? null),
      };
    });

    return {
      available: true,
      loadError: null,
      playlistId,
      playlistTitle: resolvePlaylistTitle(playlistId, enrollmentRows),
      playlistThumbnailUrl: resolvePlaylistThumbnail(playlistId, enrollmentRows),
      totalEnrollments: enrollmentRows.length,
      uniqueStudents: new Set(enrollmentRows.map((row) => row.student_id)).size,
      totalCompletions: completionRows.length,
      completionsToday,
      enrolledStudents,
    };
  } catch (error) {
    if (error && typeof error === 'object' && isMissingFreeYoutubeTableError(error as { message?: string })) {
      return createEmptyDetail(playlistId, 'Free playlist tracking tables are not available yet.');
    }

    console.error('[getFreePlaylistAnalyticsDetail]', error);
    return createEmptyDetail(playlistId, 'Could not load playlist analytics.');
  }
}
