import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface StudentProfile {
  id: string;
  user_id: string;
  college_id: string;
  full_name: string | null;
  email: string | null;
  student_code: string | null;
  created_at: string | null;
}

export interface StudentPerformanceStats {
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  coursesStarted: number;
  coursesCompleted: number;
  lastWatchedAt: string | null;
}

export interface StudentCourseProgress {
  courseId: string;
  courseTitle: string;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
}

export interface StudentActivityEntry {
  id: string;
  action: string;
  created_at: string;
}

export interface StudentDetailData {
  student: StudentProfile;
  performance: StudentPerformanceStats | null;
  courses: StudentCourseProgress[];
  recentActivity: StudentActivityEntry[];
}

async function getStudentById(
  collegeId: string,
  studentId: string,
): Promise<StudentProfile | null> {
  try {
    const supabase = createServiceRoleClient();

    const { data: student, error } = await supabase
      .from('students')
      .select('id, user_id, college_id, student_code, created_at')
      .eq('id', studentId)
      .eq('college_id', collegeId)
      .maybeSingle();

    if (error || !student) return null;

    let profile: { full_name: string | null; email: string | null } | null = null;
    if (student.user_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', student.user_id)
        .maybeSingle();
      profile = prof;
    }

    return {
      id: student.id,
      user_id: student.user_id,
      college_id: student.college_id,
      student_code: student.student_code,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      created_at: student.created_at,
    };
  } catch {
    return null;
  }
}

async function fetchStudentVideoPerformance(
  collegeId: string,
  studentId: string,
): Promise<{
  performance: StudentPerformanceStats | null;
  courses: StudentCourseProgress[];
}> {
  try {
    const { getCollegeStudentVideoDetailBundle } = await import(
      '@/lib/services/college-video-analytics'
    );

    const bundle = await getCollegeStudentVideoDetailBundle(collegeId, studentId);
    if (!bundle) {
      return { performance: null, courses: [] };
    }

    return {
      performance: {
        totalWatchHours: bundle.summary.totalWatchHours,
        lecturesWatched: bundle.summary.lecturesWatched,
        completedLectures: bundle.summary.completedLectures,
        averageCompletionPercentage: bundle.summary.averageCompletionPercentage,
        coursesStarted: bundle.summary.coursesStarted,
        coursesCompleted: bundle.summary.coursesCompleted,
        lastWatchedAt: bundle.summary.lastWatchedAt,
      },
      courses: bundle.courses.map((c) => ({
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        totalWatchHours: c.totalWatchHours,
        lecturesWatched: c.lecturesWatched,
        completedLectures: c.completedLectures,
        averageCompletionPercentage: c.averageCompletionPercentage,
      })),
    };
  } catch {
    return { performance: null, courses: [] };
  }
}

async function fetchStudentRecentActivity(
  collegeId: string,
  userId: string,
  limit = 20,
): Promise<StudentActivityEntry[]> {
  try {
    const supabase = createServiceRoleClient();

    const { data } = await supabase
      .from('audit_logs')
      .select('id, action, created_at')
      .eq('college_id', collegeId)
      .eq('actor_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data ?? []).map((a) => ({
      id: a.id,
      action: a.action,
      created_at: a.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getStudentDetail(
  collegeId: string,
  studentId: string,
): Promise<StudentDetailData | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('student-detail');
  const student = await getStudentById(collegeId, studentId);
  if (!student) return null;

  const [videoData, recentActivity] = await Promise.all([
    fetchStudentVideoPerformance(collegeId, studentId),
    fetchStudentRecentActivity(collegeId, student.user_id),
  ]);

  return {
    student,
    performance: videoData.performance,
    courses: videoData.courses,
    recentActivity,
  };
}
