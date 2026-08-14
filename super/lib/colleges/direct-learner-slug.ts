/**
 * Pure helper — safe for Client Components. Matches public.is_direct_learner_college
 * (direct-learners / direct-learner tenant slugs).
 */
export function isDirectLearnerCollegeSlug(slug: string | null | undefined): boolean {
  const s = (slug ?? '').trim().toLowerCase();
  return s === 'direct-learners' || s === 'direct-learner';
}
