import { redirect } from 'next/navigation';

/**
 * Redirect for legacy Master Course creation route.
 * Master Courses are now created inside specific Pillars.
 */
export default function CreateMasterCourseLegacyPage() {
  redirect('/master-courses');
}
