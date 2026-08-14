import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import type {
  CollegeQuizListItem,
  CollegeQuizStudentScore,
  CollegeQuizDetail,
} from '@/types/lesson-quiz-analytics';

// ─── Get Quizzes for College ──────────────────────────────────────────────────

/**
 * Returns all lesson quizzes with attempt stats for the given college.
 * Scoped by lesson_quiz_attempts.college_id = tenant.id.
 */
export async function getCollegeLessonQuizzes(
  collegeSlug: string,
): Promise<CollegeQuizListItem[]> {
  const context = await requireCollegeAdmin(collegeSlug);
  const collegeId = context.tenant.id;
  return getCollegeLessonQuizzesData(collegeId);
}

async function getCollegeLessonQuizzesData(
  collegeId: string,
): Promise<CollegeQuizListItem[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-quizzes');
  const sb = createAdminClient();

  // 1. Get all content assignments for this college to find master course IDs
  const { data: assignments } = await sb
    .from('content_assignments')
    .select('assigned_entity_id, assigned_entity_type')
    .eq('target_id', collegeId)
    .eq('assignment_type', 'college')
    .eq('status', 'active');

  if (!assignments?.length) return [];

  // 2. Resolve master course IDs from variants/bundles/master courses
  const masterCourseIds = new Set<string>();
  for (const a of assignments) {
    if (a.assigned_entity_type === 'master_course') {
      masterCourseIds.add(a.assigned_entity_id);
    } else if (a.assigned_entity_type === 'variant') {
      const { data: variant } = await sb
        .from('course_variants')
        .select('master_course_id')
        .eq('id', a.assigned_entity_id)
        .maybeSingle();
      if (variant) masterCourseIds.add(variant.master_course_id);
    } else if (a.assigned_entity_type === 'bundle') {
      const { data: bundleItems } = await sb
        .from('bundle_items')
        .select('reference_id, item_type')
        .eq('bundle_id', a.assigned_entity_id);
      for (const bi of bundleItems ?? []) {
        if (bi.item_type === 'master_course') {
          masterCourseIds.add(bi.reference_id);
        } else if (bi.item_type === 'variant') {
          const { data: v } = await sb
            .from('course_variants')
            .select('master_course_id')
            .eq('id', bi.reference_id)
            .maybeSingle();
          if (v) masterCourseIds.add(v.master_course_id);
        }
      }
    }
  }

  if (!masterCourseIds.size) return [];

  // 3. Get quiz_placeholder items with quiz_id from these courses
  const { data: quizItems } = await sb
    .from('master_course_items')
    .select(`
      id, title, quiz_id, module_id,
      master_course_modules!inner(
        title, master_course_id,
        master_courses!inner(title)
      )
    `)
    .eq('item_type', 'quiz_placeholder')
    .not('quiz_id', 'is', null)
    .in('master_course_id', Array.from(masterCourseIds));

  if (!quizItems?.length) return [];

  // 4. Get quiz_ids and fetch quiz metadata
  const quizIds = quizItems.map((qi) => qi.quiz_id).filter(Boolean) as string[];
  const { data: quizzes } = await sb
    .from('lesson_quizzes')
    .select('id, title, publish_status, passing_percentage')
    .in('id', quizIds);

  const quizMap = new Map((quizzes ?? []).map((q) => [q.id, q]));

  // 5. Batch fetch attempt stats for all quizzes (scoped by college_id)
  const { data: allAttempts } = await sb
    .from('lesson_quiz_attempts')
    .select('quiz_id, status, percentage, passed, submitted_at')
    .eq('college_id', collegeId)
    .in('quiz_id', quizIds);

  // Group attempts by quiz_id
  const attemptsByQuiz = new Map<string, typeof allAttempts>();
  for (const a of allAttempts ?? []) {
    const list = attemptsByQuiz.get(a.quiz_id) ?? [];
    list.push(a);
    attemptsByQuiz.set(a.quiz_id, list);
  }

  // 6. Build results
  const results: CollegeQuizListItem[] = [];

  for (const qi of quizItems) {
    const quiz = quizMap.get(qi.quiz_id!);
    if (!quiz) continue;

    const attempts = attemptsByQuiz.get(qi.quiz_id!) ?? [];
    const submittedAttempts = attempts.filter((a) => a.status === 'submitted');
    const submittedCount = submittedAttempts.length;

    let avgPercentage: number | null = null;
    let passRate: number | null = null;
    let latestSubmittedAt: string | null = null;

    if (submittedCount > 0) {
      const totalPct = submittedAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0);
      avgPercentage = Math.round((totalPct / submittedCount) * 100) / 100;
      const passedCount = submittedAttempts.filter((a) => a.passed).length;
      passRate = Math.round((passedCount / submittedCount) * 10000) / 100;

      // Latest submitted_at
      const sorted = [...submittedAttempts].sort(
        (a, b) => new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime(),
      );
      latestSubmittedAt = sorted[0]?.submitted_at ?? null;
    }

    const joinedMod = qi.master_course_modules as unknown as {
      title: string;
      master_course_id: string;
      master_courses: { title: string };
    };

    results.push({
      quizId: qi.quiz_id!,
      quizTitle: quiz.title,
      courseTitle: joinedMod?.master_courses?.title ?? 'Unknown Course',
      moduleTitle: joinedMod?.title ?? 'Unknown Module',
      publishStatus: quiz.publish_status,
      totalAttempts: attempts.length,
      submittedAttempts: submittedCount,
      avgPercentage,
      passRate,
      latestSubmittedAt,
    });
  }

  return results;
}

// ─── Get Quiz Detail ─────────────────────────────────────────────────────────

/**
 * Returns quiz detail info for the CollegeAdmin detail page.
 */
export async function getCollegeLessonQuizDetail(
  collegeSlug: string,
  quizId: string,
): Promise<CollegeQuizDetail | null> {
  const context = await requireCollegeAdmin(collegeSlug);
  const collegeId = context.tenant.id;
  return getCollegeLessonQuizDetailData(collegeId, quizId);
}

async function getCollegeLessonQuizDetailData(
  collegeId: string,
  quizId: string,
): Promise<CollegeQuizDetail | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-quiz-detail');
  const sb = createAdminClient();

  // Fetch quiz metadata
  const { data: quiz } = await sb
    .from('lesson_quizzes')
    .select('id, title, publish_status, passing_percentage, time_limit_minutes, max_attempts, completion_rule')
    .eq('id', quizId)
    .single();

  if (!quiz) return null;

  // Find the quiz item to get course/module info
  const { data: quizItem } = await sb
    .from('master_course_items')
    .select(`
      id, title,
      master_course_modules!inner(
        title, master_course_id,
        master_courses!inner(title)
      )
    `)
    .eq('quiz_id', quizId)
    .eq('item_type', 'quiz_placeholder')
    .maybeSingle();

  // Fetch attempt stats scoped by college_id
  const { data: attempts } = await sb
    .from('lesson_quiz_attempts')
    .select('status, percentage, passed')
    .eq('quiz_id', quizId)
    .eq('college_id', collegeId);

  const submittedAttempts = (attempts ?? []).filter((a) => a.status === 'submitted');
  const submittedCount = submittedAttempts.length;

  let avgPercentage: number | null = null;
  let passRate: number | null = null;

  if (submittedCount > 0) {
    const totalPct = submittedAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0);
    avgPercentage = Math.round((totalPct / submittedCount) * 100) / 100;
    const passedCount = submittedAttempts.filter((a) => a.passed).length;
    passRate = Math.round((passedCount / submittedCount) * 10000) / 100;
  }

  const joinedMod = quizItem?.master_course_modules as unknown as {
    title: string;
    master_course_id: string;
    master_courses: { title: string };
  } | undefined;

  return {
    quizId: quiz.id,
    quizTitle: quiz.title,
    courseTitle: joinedMod?.master_courses?.title ?? 'Unknown Course',
    moduleTitle: joinedMod?.title ?? 'Unknown Module',
    publishStatus: quiz.publish_status,
    passingPercentage: quiz.passing_percentage,
    timeLimitMinutes: quiz.time_limit_minutes,
    maxAttempts: quiz.max_attempts,
    completionRule: quiz.completion_rule,
    totalAttempts: (attempts ?? []).length,
    submittedAttempts: submittedCount,
    avgPercentage,
    passRate,
  };
}

// ─── Get Student Scores for a Quiz ───────────────────────────────────────────

/**
 * Returns per-student score breakdown for a specific quiz,
 * scoped by lesson_quiz_attempts.college_id = tenant.id.
 */
export async function getCollegeLessonQuizStudentScores(
  collegeSlug: string,
  quizId: string,
): Promise<CollegeQuizStudentScore[]> {
  const context = await requireCollegeAdmin(collegeSlug);
  const collegeId = context.tenant.id;
  return getCollegeLessonQuizStudentScoresData(collegeId, quizId);
}

async function getCollegeLessonQuizStudentScoresData(
  collegeId: string,
  quizId: string,
): Promise<CollegeQuizStudentScore[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-quiz-student-scores');
  const sb = createAdminClient();

  // Get all submitted attempts for this quiz in this college
  const { data: attempts } = await sb
    .from('lesson_quiz_attempts')
    .select('id, student_id, attempt_no, score, max_score, percentage, passed, status, submitted_at')
    .eq('quiz_id', quizId)
    .eq('college_id', collegeId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false });

  if (!attempts?.length) return [];

  // Group by student
  const byStudent = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = byStudent.get(a.student_id) ?? [];
    list.push(a);
    byStudent.set(a.student_id, list);
  }

  // Get student profiles
  const studentIds = Array.from(byStudent.keys());
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, email')
    .in('id', studentIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Try to get roll numbers from students table if it exists
  let rollNumberMap = new Map<string, string>();
  try {
    const { data: students } = await sb
      .from('students')
      .select('id, roll_number')
      .in('id', studentIds);
    rollNumberMap = new Map((students ?? []).map((s) => [s.id, s.roll_number]));
  } catch {
    // students table may not exist or may not have roll_number — ignore
  }

  // Build student scores
  const scores: CollegeQuizStudentScore[] = [];

  for (const [studentId, studentAttempts] of byStudent) {
    const profile = profileMap.get(studentId);
    let bestScore = 0;
    let bestMaxScore = 0;
    let bestPercentage = 0;
    let latestPercentage: number | null = null;
    let latestSubmittedAt: string | null = null;
    let passed = false;

    for (const a of studentAttempts) {
      if ((a.percentage ?? 0) > bestPercentage) {
        bestPercentage = a.percentage ?? 0;
        bestScore = a.score ?? 0;
        bestMaxScore = a.max_score ?? 0;
      }
      if (a.passed) passed = true;
    }

    // Latest (first in list since ordered by submitted_at desc)
    latestPercentage = studentAttempts[0]?.percentage ?? null;
    latestSubmittedAt = studentAttempts[0]?.submitted_at ?? null;

    scores.push({
      studentId,
      studentName: profile?.full_name ?? 'Unknown',
      studentEmail: profile?.email ?? '',
      rollNumber: rollNumberMap.get(studentId) ?? null,
      attempts: studentAttempts.length,
      bestScore,
      bestMaxScore,
      bestPercentage,
      latestPercentage,
      latestSubmittedAt,
      passed,
    });
  }

  // Sort by best percentage descending
  scores.sort((a, b) => (b.bestPercentage ?? 0) - (a.bestPercentage ?? 0));

  return scores;
}
