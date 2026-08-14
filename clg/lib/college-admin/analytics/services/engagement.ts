import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';

import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getCollegeStudentIds,
  isMissingRelationError,
} from '@/lib/college-admin/analytics/college-scope';

const INACTIVE_DAYS = 14;

export interface CollegeAtRiskStudentRow {
  student_id: string;
  student_name: string;
  student_email: string;
  risk_status: string;
  last_active_at: string | null;
  avg_score: number | null;
  total_items: number;
  completed_items: number;
}

function startOfUtcWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export class CollegeEngagementService {
  static async getStudentEngagement(collegeId: string) {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('student_video_progress')
      .select('student_id, completed, unique_watched_seconds, students!inner(college_id)')
      .eq('students.college_id', collegeId);

    if (error) {
      throw new Error(`[college-analytics] student_video_progress: ${error.message}`);
    }

    let completedItems = 0;
    let totalItems = 0;
    const activeLearners = new Set<string>();

    for (const row of data ?? []) {
      totalItems++;
      if (row.completed) {
        completedItems++;
      }
      if (Number(row.unique_watched_seconds) > 0) {
        activeLearners.add(row.student_id);
      }
    }

    return {
      completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      activeLearnersCount: activeLearners.size,
      totalProgressRecords: totalItems,
    };
  }

  static async getAtRiskSummary(collegeId: string) {
    const details = await this.getAtRiskDetails(collegeId);
    return { atRiskCount: details.length };
  }

  static async getAtRiskDetails(collegeId: string): Promise<CollegeAtRiskStudentRow[]> {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const { data: viewRows, error: viewError } = await supabase
      .from('v_student_risk_profile')
      .select(
        'student_id, student_name, student_email, risk_status, last_active_at, avg_score, total_items, completed_items, is_at_risk, college_id',
      )
      .eq('college_id', collegeId)
      .eq('is_at_risk', true)
      .order('last_active_at', { ascending: true, nullsFirst: true });

    if (!viewError && viewRows) {
      return viewRows.map((row) => ({
        student_id: row.student_id,
        student_name: row.student_name ?? 'Unknown',
        student_email: row.student_email ?? '',
        risk_status: row.risk_status ?? 'At risk',
        last_active_at: row.last_active_at,
        avg_score: row.avg_score,
        total_items: row.total_items ?? 0,
        completed_items: row.completed_items ?? 0,
      }));
    }

    if (viewError && !isMissingRelationError(viewError.message)) {
      throw viewError;
    }

    return CollegeEngagementService.computeAtRiskFromProgress(collegeId);
  }

  private static async computeAtRiskFromProgress(
    collegeId: string,
  ): Promise<CollegeAtRiskStudentRow[]> {
    const supabase = createServiceRoleClient();

    const [{ data: students, error: studentsError }, { data: progress, error: progressError }] =
      await Promise.all([
        supabase
          .from('students')
          .select('id, user_id')
          .eq('college_id', collegeId),
        supabase
          .from('student_video_progress')
          .select('student_id, completed, unique_watched_seconds, video_duration_seconds, last_watched_at, students!inner(college_id)')
          .eq('students.college_id', collegeId),
      ]);

    if (studentsError) {
      throw new Error(`[college-analytics] students: ${studentsError.message}`);
    }
    if (progressError) {
      throw new Error(`[college-analytics] student_video_progress: ${progressError.message}`);
    }

    const userIds = (students ?? []).map((s) => s.user_id).filter(Boolean);
    let profiles: { id: string; full_name: string | null; email: string | null }[] = [];
    if (userIds.length > 0) {
      const { data: profs, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      if (profilesError) {
        throw new Error(`[college-analytics] profiles: ${profilesError.message}`);
      }
      profiles = profs ?? [];
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    for (const student of students ?? []) {
      const prof = profileMap.get(student.user_id);
      (student as Record<string, unknown>).profiles = prof ? { full_name: prof.full_name, email: prof.email } : undefined;
    }

    const _studentById = new Map((students ?? []).map((s) => [s.id, s]));

    const byStudent = new Map<
      string,
      {
        lastActive: number;
        totalItems: number;
        completedItems: number;
        pctSum: number;
        pctCount: number;
        hasStarted: boolean;
      }
    >();

    for (const row of progress ?? []) {
      const entry = byStudent.get(row.student_id) ?? {
        lastActive: 0,
        totalItems: 0,
        completedItems: 0,
        pctSum: 0,
        pctCount: 0,
        hasStarted: false,
      };

      entry.totalItems++;
      if (row.completed) {
        entry.completedItems++;
      }

      const watched = Number(row.unique_watched_seconds) || 0;
      const total = Number(row.video_duration_seconds) || 0;
      if (watched > 0) {
        entry.hasStarted = true;
      }
      const pct = total > 0 ? Math.min(100, Math.round((watched / total) * 100)) : 0;
      entry.pctSum += pct;
      entry.pctCount++;

      const updated = new Date(row.last_watched_at).getTime();
      if (!Number.isNaN(updated) && updated > entry.lastActive) {
        entry.lastActive = updated;
      }

      byStudent.set(row.student_id, entry);
    }

    const now = Date.now();
    const inactiveMs = INACTIVE_DAYS * 24 * 60 * 60 * 1000;
    const atRisk: CollegeAtRiskStudentRow[] = [];

    for (const student of (students ?? []) as Record<string, unknown>[]) {
      const studentId = student.id as string;
      const stats = byStudent.get(studentId);
      const profile = (Array.isArray(student.profiles) ? student.profiles[0] : student.profiles) as { full_name: string | null; email: string | null } | undefined;

      const lastActiveAt =
        stats && stats.lastActive > 0 ? new Date(stats.lastActive).toISOString() : null;
      const inactive =
        !stats || stats.lastActive === 0 || now - stats.lastActive > inactiveMs;
      const avgScore =
        stats && stats.pctCount > 0 ? Math.round(stats.pctSum / stats.pctCount) : null;
      const lowProgress =
        stats &&
        stats.hasStarted &&
        stats.totalItems > 0 &&
        stats.completedItems / stats.totalItems < 0.2;

      if (!inactive && !lowProgress) {
        continue;
      }

      let riskStatus = 'Inactive learner';
      if (inactive && lowProgress) {
        riskStatus = 'Inactive · Low completion';
      } else if (lowProgress) {
        riskStatus = 'Low completion';
      }

      atRisk.push({
        student_id: studentId,
        student_name: profile?.full_name ?? 'Unknown',
        student_email: profile?.email ?? '',
        risk_status: riskStatus,
        last_active_at: lastActiveAt,
        avg_score: avgScore,
        total_items: stats?.totalItems ?? 0,
        completed_items: stats?.completedItems ?? 0,
      });
    }

    return atRisk.sort((a, b) => {
      const aTime = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
      const bTime = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
      return aTime - bTime;
    });
  }

  static async getWeeklyPerformance(collegeId: string) {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const { data: viewRows, error: viewError } = await supabase
      .from('v_college_weekly_performance')
      .select('week_start, avg_score, submissions_count')
      .eq('college_id', collegeId)
      .order('week_start', { ascending: true });

    if (!viewError && viewRows && viewRows.length > 0) {
      return viewRows;
    }

    if (viewError && !isMissingRelationError(viewError.message)) {
      throw viewError;
    }

    // TODO: Replace JS fallback with materialized view (v_college_weekly_performance) on live DB.
    return CollegeEngagementService.computeWeeklyPerformanceFromProgress(collegeId);
  }

  // TODO: Remove this JS fallback once the v_college_weekly_performance materialized view exists on the live DB.
  private static async computeWeeklyPerformanceFromProgress(collegeId: string) {
    const supabase = createServiceRoleClient();

    const weekStarts: Date[] = [];
    const cursor = startOfUtcWeek(new Date());
    for (let i = 7; i >= 0; i--) {
      const w = new Date(cursor);
      w.setUTCDate(w.getUTCDate() - i * 7);
      weekStarts.push(w);
    }

    const rangeStart = weekStarts[0];
    const rangeEnd = new Date(weekStarts[weekStarts.length - 1]);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 7);

    const [{ data: progress, error: progressError }, { data: sessions, error: sessionsError }] =
      await Promise.all([
        supabase
          .from('student_video_progress')
          .select('student_id, unique_watched_seconds, video_duration_seconds, last_watched_at, students!inner(college_id)')
          .eq('students.college_id', collegeId)
          .gte('last_watched_at', rangeStart.toISOString())
          .lt('last_watched_at', rangeEnd.toISOString()),
        supabase
          .from('video_watch_sessions')
          .select('student_id, created_at, total_video_seconds_watched, students!inner(college_id)')
          .eq('students.college_id', collegeId)
          .gte('created_at', rangeStart.toISOString())
          .lt('created_at', rangeEnd.toISOString()),
      ]);

    if (progressError) {
      throw new Error(`[college-analytics] student_video_progress weekly: ${progressError.message}`);
    }
    if (sessionsError) {
      throw new Error(`[college-analytics] video_watch_sessions weekly: ${sessionsError.message}`);
    }

    return weekStarts.map((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      const weekProgress = (progress ?? []).filter((row) => {
        const t = new Date(row.last_watched_at).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      });

      const weekSessions = (sessions ?? []).filter((row) => {
        const t = new Date(row.created_at).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      });

      let pctSum = 0;
      let pctCount = 0;
      for (const row of weekProgress) {
        const watched = Number(row.unique_watched_seconds) || 0;
        const total = Number(row.video_duration_seconds) || 0;
        if (total > 0) {
          pctSum += Math.min(100, Math.round((watched / total) * 100));
          pctCount++;
        }
      }

      const activeFromProgress = weekProgress.reduce((acc, r) => {
        if (Number(r.unique_watched_seconds) > 0) acc.push(r.student_id);
        return acc;
      }, [] as string[]);
      const activeFromSessions = weekSessions.reduce((acc, r) => {
        if (Number(r.total_video_seconds_watched) > 0) acc.push(r.student_id);
        return acc;
      }, [] as string[]);

      const submissions_count = Math.max(new Set(activeFromProgress).size, new Set(activeFromSessions).size);

      return {
        week_start: weekStart.toISOString().slice(0, 10),
        avg_score: pctCount > 0 ? Math.round(pctSum / pctCount) : 0,
        submissions_count,
      };
    });
  }

  static async getWeeklyEngagement(collegeId: string) {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const { data: viewRows, error: viewError } = await supabase
      .from('v_college_weekly_engagement')
      .select('report_day, active_students')
      .eq('college_id', collegeId)
      .order('report_day', { ascending: true })
      .limit(28);

    if (!viewError && viewRows && viewRows.length > 0) {
      return viewRows;
    }

    if (viewError && !isMissingRelationError(viewError.message)) {
      throw viewError;
    }

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 27);
    start.setUTCHours(0, 0, 0, 0);

    const { data: sessions, error: sessionsError } = await supabase
      .from('video_watch_sessions')
      .select('student_id, created_at, students!inner(college_id)')
      .eq('students.college_id', collegeId)
      .gte('created_at', start.toISOString());

    if (sessionsError) {
      throw new Error(`[college-analytics] video_watch_sessions engagement: ${sessionsError.message}`);
    }

    const byDay = new Map<string, Set<string>>();
    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      byDay.set(d.toISOString().slice(0, 10), new Set());
    }

    for (const row of sessions ?? []) {
      const day = new Date(row.created_at).toISOString().slice(0, 10);
      const set = byDay.get(day);
      if (set) {
        set.add(row.student_id);
      }
    }

    return [...byDay.entries()].map(([report_day, students]) => ({
      report_day,
      active_students: students.size,
    }));
  }

  // TODO: Once v_college_score_distribution materialized view is created on the live DB, this method should
  // query the view instead of returning an empty array as a fallback.
  static async getScoreDistribution(collegeId: string) {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('v_college_score_distribution')
      .select('score_range, student_count')
      .eq('college_id', collegeId);

    if (error && isMissingRelationError(error.message)) {
      return [];
    }
    if (error) {
      throw error;
    }
    return data ?? [];
  }

  static async getTotalWatchMetrics(collegeId: string) {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('student_video_progress')
      .select('unique_watched_seconds, total_video_seconds_watched, completed, students!inner(college_id)')
      .eq('students.college_id', collegeId);

    if (error) {
      throw new Error(`[college-analytics] watch_metrics: ${error.message}`);
    }

    let totalSeconds = 0;
    let watchedCount = 0;
    let completedCount = 0;

    for (const row of data ?? []) {
      const uniqueSecs = Number(row.unique_watched_seconds) || 0;
      const secs = Number(row.total_video_seconds_watched) || 0;
      totalSeconds += secs;
      if (uniqueSecs > 0) watchedCount++;
      if (row.completed) completedCount++;
    }

    return {
      totalWatchHours: Math.round((totalSeconds / 3600) * 10) / 10,
      totalWatchedLectures: watchedCount,
      totalCompletedLectures: completedCount,
    };
  }

  static async getEngagementTiers(collegeId: string) {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const [studentIds, sessionsResult] = await Promise.all([
      getCollegeStudentIds(collegeId),
      supabase
        .from('video_watch_sessions')
        .select('student_id, total_video_seconds_watched, students!inner(college_id)')
        .eq('students.college_id', collegeId),
    ]);

    const { data, error } = sessionsResult;
    if (error) {
      throw new Error(`[college-analytics] video_watch_sessions engagement_tiers: ${error.message}`);
    }

    const perStudent = new Map<string, number>();
    for (const row of data ?? []) {
      const current = perStudent.get(row.student_id) ?? 0;
      perStudent.set(row.student_id, current + (Number(row.total_video_seconds_watched) || 0));
    }

    const counts: Record<string, number> = {
      Dormant: 0,
      Occasional: 0,
      Regular: 0,
      Engaged: 0,
      Power: 0,
    };

    for (const sid of studentIds) {
      const secs = perStudent.get(sid) ?? 0;
      const hours = secs / 3600;
      if (hours === 0) counts.Dormant++;
      else if (hours < 1) counts.Occasional++;
      else if (hours < 5) counts.Regular++;
      else if (hours < 20) counts.Engaged++;
      else counts.Power++;
    }

    const total = studentIds.length;
    return Object.entries(counts).map(([tier, count]) => ({
      tier,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  static async getDayOfWeekActivity(collegeId: string) {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const [
      _studentIds,
      segmentsResult,
      sessionsResult,
      allStudentSegsResult
    ] = await Promise.all([
      getCollegeStudentIds(collegeId),
      supabase
        .from('video_watch_segments')
        .select('student_id, created_at, start_second, end_second, session_id, students!inner(college_id)')
        .eq('students.college_id', collegeId),
      supabase
        .from('video_watch_sessions')
        .select('id, student_id, created_at, total_video_seconds_watched, students!inner(college_id)')
        .eq('students.college_id', collegeId),
      supabase
        .from('video_watch_segments')
        .select('session_id, students!inner(college_id)')
        .eq('students.college_id', collegeId),
    ]);

    const { data: segments, error: segError } = segmentsResult;
    const { data: sessions, error: sessError } = sessionsResult;
    const { data: allStudentSegs } = allStudentSegsResult;

    if (segError) {
      throw new Error(`[college-analytics] video_watch_segments day_of_week: ${segError.message}`);
    }
    if (sessError) {
      throw new Error(`[college-analytics] video_watch_sessions day_of_week: ${sessError.message}`);
    }

    const sessionIdsWithSegments = new Set((allStudentSegs ?? []).flatMap(s => s.session_id ? [s.session_id] : []));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDay = Array.from({ length: 7 }, () => ({
      students: new Set<string>(),
      hours: 0,
    }));

    for (const s of segments ?? []) {
      const d = new Date(s.created_at);
      const dayIndex = d.getUTCDay();
      byDay[dayIndex].students.add(s.student_id);
      const secs = Math.max(0, Number(s.end_second) - Number(s.start_second));
      byDay[dayIndex].hours += secs;
    }

    for (const s of sessions ?? []) {
      if (sessionIdsWithSegments.has(s.id)) continue;
      const d = new Date(s.created_at);
      const dayIndex = d.getUTCDay();
      byDay[dayIndex].students.add(s.student_id);
      byDay[dayIndex].hours += Number(s.total_video_seconds_watched) || 0;
    }

    return byDay.map((day, i) => ({
      dayLabel: dayNames[i],
      activeStudents: day.students.size,
      watchHours: Math.round((day.hours / 3600) * 10) / 10,
    }));
  }
}
