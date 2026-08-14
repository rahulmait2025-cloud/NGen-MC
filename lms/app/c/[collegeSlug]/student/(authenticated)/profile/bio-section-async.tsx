import { createClient } from '@/lib/supabase/server';
import { getStudentByCollegeId } from '@/lib/tenant/get-tenant';
import { BioSection } from './bio-section';

/**
 * Async section: fetches bio data and renders bio section.
 * Streams in via Suspense after the static profile shell is visible.
 */
export async function BioSectionAsync({
  collegeId,
  collegeSlug,
}: {
  collegeId: string;
  collegeSlug: string;
}) {
  const student = await getStudentByCollegeId(collegeId);
  if (!student) return null;

  const supabase = await createClient();
  const { data: bioResult } = await supabase
    .from('students')
    .select('bio')
    .eq('id', student.id)
    .maybeSingle();

  const bio = (bioResult as { bio?: string | null } | null)?.bio ?? null;

  return (
    <div className="mb-8">
      <BioSection
        bio={bio}
        collegeId={collegeId}
        collegeSlug={collegeSlug}
      />
    </div>
  );
}
