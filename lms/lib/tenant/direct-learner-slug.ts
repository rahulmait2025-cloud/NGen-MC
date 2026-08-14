/**
 * Canonical **B2C direct-learner** tenant slugs — keep in sync with DB `get_direct_learner_college_id` / seed.
 *
 * **Not** the legacy `unknown` college (`slug === 'unknown'`): unknown uses `ChangeCollegeSection` /
 * `changeCollegeFromUnknown` (partner matching). Direct learners use `B2cSelfReportedCollegeSection` and
 * `non_partnered_students` for optional school text only.
 *
 * No `server-only` so client components can branch safely.
 */
export function isDirectLearnerCollegeSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  return s === 'direct-learners' || s === 'direct-learner';
}
