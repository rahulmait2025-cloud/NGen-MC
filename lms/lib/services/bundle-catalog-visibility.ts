import 'server-only';

import type { CatalogVisibilityScope } from '@/types/database';

export function isBundleVisibleToStudent(
  visibilityScope: CatalogVisibilityScope,
  collegeId: string | null,
  visibleCollegeIds: Set<string>,
): boolean {
  if (visibilityScope === 'private') return false;
  if (visibilityScope === 'global') return true;
  if (visibilityScope === 'selected_colleges') {
    return !!collegeId && visibleCollegeIds.has(collegeId);
  }
  return false;
}

export type BundleListSection = 'curated' | 'catalog' | 'all';

export function matchesBundleListSection(
  section: BundleListSection,
  showOnCurated: boolean,
  showOnCatalog: boolean,
): boolean {
  if (section === 'curated') return showOnCurated;
  if (section === 'catalog') return showOnCatalog;
  return showOnCurated || showOnCatalog;
}
