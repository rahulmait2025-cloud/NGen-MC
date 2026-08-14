import { getDailyStreakCached } from '@/lib/streak/daily-streak';
import { getStudentByCollegeId } from '@/lib/tenant/get-tenant';
import { ProfileStats } from './profile-stats';

/**
 * Async section: fetches streak data and renders profile stats.
 * Streams in via Suspense after the static profile shell is visible.
 */
export async function ProfileStatsSection({
  collegeId,
}: {
  collegeId: string;
}) {
  const student = await getStudentByCollegeId(collegeId);
  if (!student) return null;

  const profileCheckFields = [
    { filled: Boolean(student.github_url) },
    { filled: Boolean(student.linkedin_url) },
    { filled: Boolean(student.resume_url) },
    { filled: Boolean(student.year_or_semester) },
  ];
  const completedItems = profileCheckFields.filter((f) => f.filled).length;
  const totalItems = profileCheckFields.length;
  const completionPercent = Math.round((completedItems / totalItems) * 100);

  const streakResult = await getDailyStreakCached(student.id);

  return (
    <ProfileStats
      currentStreak={streakResult.currentStreak}
      bestStreak={streakResult.longestStreak}
      completionPercent={completionPercent}
      completedItems={completedItems}
      totalItems={totalItems}
    />
  );
}
