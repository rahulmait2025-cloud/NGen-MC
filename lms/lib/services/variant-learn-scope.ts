import 'server-only';

import { normUuid } from '@/lib/utils';
import { resolveDiscoverableVariantItemScope } from '@/lib/services/student-discoverable-catalog';

export { buildLearnHref, resolveVariantIdFromSearchParams } from '@/lib/utils/variant-learn-url';

export async function assertItemInVariantLearnScope(
  variantId: string,
  masterCourseId: string,
  itemId: string,
  collegeId: string | null,
): Promise<boolean> {
  const scope = await resolveDiscoverableVariantItemScope(
    variantId,
    masterCourseId,
    collegeId,
  );
  if (!scope) return false;
  const want = normUuid(itemId);
  for (const allowedId of scope.itemIds) {
    if (normUuid(allowedId) === want) return true;
  }
  return false;
}
